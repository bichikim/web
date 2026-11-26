import {createSignal, onCleanup} from 'solid-js'
import {
  type ConvertCmo3Result,
  convertCubismFolder,
  convertModelFiles,
  getModelFormat,
} from '@winter-love/puppet/converter'

import {serializeDocumentChunks} from '@winter-love/puppet/player'

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

interface ConversionInput {
  readonly folder: ReadonlyArray<File>
  readonly model: File | null
  readonly sdk?: File
  readonly textures: ReadonlyArray<File>
}

/** 파일 선택과 텍스처 순서 변경을 변환에 반영하며 최신 결과의 다운로드 URL을 소유한다. */
export const useConverter = () => {
  const [state, setState] = createSignal<ConversionState>({kind: 'idle'})
  let input: ConversionInput = {folder: [], model: null, textures: []}
  const [selection, setSelection] = createSignal(input)
  let downloadUrl: string | undefined
  let conversionId = 0
  let controller: AbortController | undefined
  const format = () => {
    const {folder, model} = selection()
    if (folder.length > 0) {
      return 'folder'
    }
    return model === null ? undefined : getModelFormat(model.name)
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

  const convert = async (next: ConversionInput) => {
    input = next
    setSelection(next)
    const {folder: files, model, sdk, textures} = next
    conversionId += 1
    const current = conversionId
    controller?.abort()
    const nextController = new AbortController()
    controller = nextController
    releaseDownload()
    setState({kind: 'idle'})
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
              textures,
            })
      if (current !== conversionId) {
        return
      }
      const blob = new Blob([...serializeDocumentChunks(result.document)], {
        type: 'application/json',
      })
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
    const sdk = selectedFormat === 'moc3' || selectedFormat === 'zip' ? undefined : input.sdk
    return convert({folder: [], model: file ?? null, sdk, textures: []})
  }
  const selectFolder = (files: ReadonlyArray<File>) => {
    if (files.length > 0) {
      return convert({folder: files, model: null, textures: []})
    }
  }
  const selectSdk = (file: File | undefined) => convert({...input, sdk: file})
  const selectTextures = (files: ReadonlyArray<File>) =>
    convert({
      ...input,
      textures: files.toSorted((first, second) =>
        first.name.localeCompare(second.name, undefined, {numeric: true}),
      ),
    })
  const moveTexture = (index: number, direction: -1 | 1) => {
    const next = [...input.textures]
    const destination = index + direction
    if (destination < 0 || destination >= next.length) {
      return
    }
    const [moved] = next.splice(index, 1)
    if (moved === undefined) {
      return
    }
    next.splice(destination, 0, moved)
    return convert({...input, textures: next})
  }
  return {
    error: () => {
      const value = state()
      return value.kind === 'error' ? value.message : undefined
    },
    format,
    moc3Source: () => (format() === 'moc3' ? selection().model : null),
    moveTexture,
    ready: () => {
      const value = state()
      return value.kind === 'ready' ? value : undefined
    },
    selectFolder,
    selectSdk,
    selectSource,
    selectTextures,
    textures: () => selection().textures,
    working: () => state().kind === 'working',
  }
}
