import {jsonObject} from './json-fields'

interface CubismModelSource {
  readonly path: string
  readonly model: Record<string, unknown>
}

const choosePath = (paths: ReadonlyArray<string>, selected: string | undefined, kind: string) => {
  const path = selected ?? (paths.length === 1 ? paths[0] : undefined)
  if (paths.length === 0 && selected === undefined) {
    throw new Error(`${kind} 모델 파일이 없습니다.`)
  }
  if (path === undefined || !paths.includes(path)) {
    throw new Error(`${kind} 파일을 하나로 확정할 수 없습니다. 변환할 모델 폴더만 선택하세요.`)
  }
  return path
}

const inferTextures = (paths: ReadonlyArray<string>) => {
  const images = paths.filter((path) => /\.png$/iu.test(path))
  if (images.length === 0) {
    throw new Error('PNG 텍스처 파일이 없습니다. .moc3와 함께 제공된 PNG를 포함하세요.')
  }
  const numbered = images
    .flatMap((path) => {
      const matched = /(?:^|\/)texture[_-]?(?<index>\d+)\.png$/iu.exec(path)
      return matched === null ? [] : [{index: Number(matched.groups!.index), path}]
    })
    .sort((first, second) => first.index - second.index)
  if (images.length === 1 && numbered.length === 0) {
    return images
  }
  const indices = new Set(numbered.map((entry) => entry.index))
  if (indices.size !== numbered.length) {
    throw new Error(
      'PNG 텍스처 번호가 중복되었습니다. model3.json을 포함하거나 해당 모델의 텍스처만 선택하세요.',
    )
  }
  const gaps = numbered.flatMap((entry, index) => {
    const first = (numbered[index - 1]?.index ?? -1) + 1
    if (entry.index <= first) {
      return []
    }
    return [entry.index === first + 1 ? String(first) : `${first}~${entry.index - 1}`]
  })
  if (gaps.length > 0) {
    throw new Error(
      `PNG 텍스처 번호 누락: 인덱스 ${gaps.join(', ')} (0부터 시작). model3.json 또는 해당 번호의 PNG를 포함하세요.`,
    )
  }
  if (numbered.length === 0 || numbered.some((entry, index) => entry.index !== index)) {
    throw new Error(
      'PNG 텍스처 순서를 확정할 수 없습니다. model3.json을 포함하거나 texture_00.png부터 연속 번호를 사용하세요.',
    )
  }
  return numbered.map((entry) => entry.path)
}

/** 설정 파일의 참조를 우선하고, 없으면 단일 MOC3와 번호가 연속된 텍스처를 찾는다. */
export const findCubismModel = (
  entries: ReadonlyMap<string, Uint8Array>,
  selected?: string,
): CubismModelSource => {
  const paths = [...entries.keys()].filter((path) =>
    path.split('/').every((segment) => !segment.startsWith('.') && segment !== '__MACOSX'),
  )
  const manifests = paths.filter((path) => /\.model3\.json$/iu.test(path))
  if (manifests.length > 0 || selected !== undefined) {
    const path = choosePath(manifests, selected, 'model3.json')
    const bytes = entries.get(path)!
    return {
      model: jsonObject(JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes))),
      path,
    }
  }
  const moc = choosePath(
    paths.filter((path) => /\.moc3$/iu.test(path)),
    undefined,
    '.moc3',
  )
  const directory = moc.slice(0, moc.lastIndexOf('/') + 1)
  const textures = inferTextures(paths.filter((path) => path.startsWith(directory)))
  return {
    model: {
      FileReferences: {
        Moc: moc.slice(directory.length),
        Textures: textures.map((path) => path.slice(directory.length)),
      },
      Version: 3,
    },
    path: moc.replace(/\.moc3$/iu, '.model3.json'),
  }
}
