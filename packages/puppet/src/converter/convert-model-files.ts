import {convertCmo3, type ConvertCmo3Result} from './convert-cmo3'
import {convertCubismArchive} from './convert-cubism-archive'
import {convertMoc3} from './convert-moc3'
import {readCubismTexture} from './read-cubism-texture'

export const getModelFormat = (name: string) => {
  const extension = name.split('.').at(-1)?.toLowerCase()
  switch (extension) {
    case 'cmo3':
    case 'moc3':
    case 'zip':
      return extension
    default:
      return undefined
  }
}

export interface ConvertModelFilesOptions {
  /** 변환할 CMO3, MOC3 또는 SDK ZIP. */
  readonly model: File
  /** CMO3에 함께 적용할 SDK ZIP. 생략하면 편집 원본만 변환한다. */
  readonly sdk?: File
  /** 새 선택이나 화면 종료로 중단되면 파일 읽기 후 변환을 시작하지 않는다. 생략하면 끝까지 실행한다. */
  readonly signal?: AbortSignal
  /** MOC3의 텍스처 인덱스 순서로 정렬한 PNG 파일. 다른 형식에서는 사용하지 않는다. */
  readonly textures: ReadonlyArray<File>
}

/** 선택한 로컬 모델과 관련 파일을 읽어 자체 Poffo 문서로 변환한다. */
export const convertModelFiles = async (
  options: ConvertModelFilesOptions,
): Promise<ConvertCmo3Result> => {
  const format = getModelFormat(options.model.name)
  options.signal?.throwIfAborted()
  switch (format) {
    case 'cmo3': {
      const [model, sdk] = await Promise.all([
        options.model.arrayBuffer(),
        options.sdk?.arrayBuffer(),
      ])
      options.signal?.throwIfAborted()
      return sdk === undefined
        ? convertCmo3(model)
        : convertCubismArchive(sdk, {modelSource: model})
    }
    case 'moc3': {
      if (options.textures.length === 0) {
        throw new Error('PNG 텍스처 파일이 없습니다. .moc3와 함께 제공된 PNG를 선택하세요.')
      }
      const [model, textures] = await Promise.all([
        options.model.arrayBuffer(),
        Promise.all(options.textures.map((texture) => texture.arrayBuffer())),
      ])
      options.signal?.throwIfAborted()
      return convertMoc3(model, {
        textures: textures.map((bytes) => readCubismTexture(new Uint8Array(bytes))),
      })
    }
    case 'zip': {
      const bytes = await options.model.arrayBuffer()
      options.signal?.throwIfAborted()
      return convertCubismArchive(bytes)
    }
    case undefined:
      throw new Error('.cmo3, .moc3 또는 SDK 모델 ZIP을 선택하세요.')
    default: {
      const exhaustive: never = format
      return exhaustive
    }
  }
}
