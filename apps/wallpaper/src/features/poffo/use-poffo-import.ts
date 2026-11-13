import {createSignal, onCleanup} from 'solid-js'
import {importPoffoAsset} from './import-poffo-asset'

export const usePoffoImport = (select: (id: string) => void) => {
  const [error, setError] = createSignal<string | null>(null)
  let revision = 0
  onCleanup(() => {
    revision += 1
  })
  const selectAsset = (id: string) => {
    revision += 1
    select(id)
  }
  const importFiles = async (files: readonly File[]) => {
    const [file] = files
    if (file === undefined) {
      return
    }
    revision += 1
    const request = revision
    setError(null)
    try {
      const stored = await importPoffoAsset(file)
      if (request === revision) {
        select(stored.id)
      }
    } catch (cause) {
      console.error('Poffo import failed', cause)
      if (request === revision) {
        setError('Poffo 파일을 가져오지 못했어요.')
      }
    }
  }
  return {error, importFiles, selectAsset}
}
