import {createSignal} from 'solid-js'
import {importPoffoAsset} from './import-poffo-asset'

export const usePoffoImport = (select: (id: string) => void) => {
  const [error, setError] = createSignal<string | null>(null)
  const importFiles = async (files: readonly File[]) => {
    const [file] = files
    if (file === undefined) {
      return
    }
    setError(null)
    try {
      const stored = await importPoffoAsset(file)
      select(stored.id)
    } catch (cause) {
      console.error('Poffo import failed', cause)
      setError('Poffo 파일을 가져오지 못했어요.')
    }
  }
  return {error, importFiles}
}
