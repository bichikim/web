import {createSignal, onCleanup} from 'solid-js'
import {
  type ConvertCmo3Result,
  convertCubismFolder,
  convertModelFiles,
  getModelFormat,
} from '@winter-love/puppet/converter'

import {serializeDocument} from '@winter-love/puppet/player'

interface ConversionReady {
  readonly kind: 'ready'
  readonly name: string
  readonly result: ConvertCmo3Result
  readonly url: string
}

interface ConversionError {
  readonly kind: 'error'
  readonly message: string
}

type ConversionState = {readonly kind: 'idle' | 'working'} | ConversionReady | ConversionError

/** 파일 선택과 텍스처 순서 변경을 변환에 반영하며 최신 결과의 다운로드 URL을 소유한다. */
export const useConverter = () => {
  const [state, setState] = createSignal<ConversionState>({kind: 'idle'})
  const [source, setSource] = createSignal<File | null>(null)
  const [folder, setFolder] = createSignal<ReadonlyArray<File>>([])
  const [textures, setTextures] = createSignal<ReadonlyArray<File>>([])
  let sdk: File | undefined
  let downloadUrl: string | undefined
  let conversionId = 0
  let controller: AbortController | undefined
  const format = () => {
    if (folder().length > 0) {
      return 'folder'
    }
    const file = source()
    return file === null ? undefined : getModelFormat(file.name)
  }
  const releaseDownload = () => {
    if (downloadUrl !== undefined) {
      URL.revokeObjectURL(downloadUrl)
      downloadUrl = undefined
    }
  }
  onCleanup(() => {
    conversionId += 1
    controller?.abort()
    releaseDownload()
  })

  const convert = async () => {
    conversionId += 1
    const current = conversionId
    controller?.abort()
    const nextController = new AbortController()
    controller = nextController
    releaseDownload()
    setState({kind: 'idle'})
    const model = source()
    const files = folder()
    const selected = textures()
    if (model === null && files.length === 0) {
      return
    }
    setState({kind: 'working'})
    try {
      const result =
        model === null
          ? await convertCubismFolder(files, nextController.signal)
          : await convertModelFiles({
              model,
              sdk,
              signal: nextController.signal,
              textures: selected,
            })
      if (current !== conversionId) {
        return
      }
      const blob = new Blob([serializeDocument(result.document)], {type: 'application/json'})
      const url = URL.createObjectURL(blob)
      downloadUrl = url
      const name =
        model === null
          ? files[0]?.webkitRelativePath.split('/')[0] || 'model'
          : model.name.replace(/\.(?:cmo3|moc3|zip)$/iu, '')
      setState({kind: 'ready', name, result, url})
    } catch (error) {
      if (current === conversionId) {
        setState({
          kind: 'error',
          message: error instanceof Error ? error.message : '모델을 변환하지 못했습니다.',
        })
      }
    }
  }
  const selectSource = (file: File | undefined) => {
    const selectedFormat = file === undefined ? undefined : getModelFormat(file.name)
    if (selectedFormat === 'moc3' || selectedFormat === 'zip') {
      sdk = undefined
    }
    setSource(file ?? null)
    setFolder([])
    setTextures([])
    return convert()
  }
  const selectFolder = (files: ReadonlyArray<File>) => {
    if (files.length === 0) {
      return
    }
    sdk = undefined
    setSource(null)
    setTextures([])
    setFolder(files)
    return convert()
  }
  const selectSdk = (file: File | undefined) => {
    sdk = file
    return convert()
  }
  const selectTextures = (files: ReadonlyArray<File>) => {
    setTextures(
      [...files].sort((first, second) =>
        first.name.localeCompare(second.name, undefined, {numeric: true}),
      ),
    )
    return convert()
  }
  const moveTexture = (index: number, direction: -1 | 1) => {
    const next = [...textures()]
    const destination = index + direction
    if (destination < 0 || destination >= next.length) {
      return
    }
    const [moved] = next.splice(index, 1)
    if (moved === undefined) {
      return
    }
    next.splice(destination, 0, moved)
    setTextures(next)
    return convert()
  }
  return {
    error: () => {
      const value = state()
      return value.kind === 'error' ? value.message : undefined
    },
    format,
    moc3Source: () => (format() === 'moc3' ? source() : null),
    moveTexture,
    ready: () => {
      const value = state()
      return value.kind === 'ready' ? value : undefined
    },
    selectFolder,
    selectSdk,
    selectSource,
    selectTextures,
    textures,
    working: () => state().kind === 'working',
  }
}
