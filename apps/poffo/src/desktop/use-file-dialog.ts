import {open} from '@tauri-apps/plugin-dialog'
import {readFile} from '@tauri-apps/plugin-fs'
import {basename} from '@tauri-apps/api/path'
import {createSignal, onCleanup} from 'solid-js'

interface OpenFileOptions {
  readonly title: string
  readonly extensions: ReadonlyArray<string>
}

export const useFileDialog = () => {
  const [error, setError] = createSignal<string | null>(null)
  let pending = false
  let disposed = false
  onCleanup(() => {
    disposed = true
  })
  const openFile = async (options: OpenFileOptions): Promise<File | undefined> => {
    if (pending || disposed) {
      return undefined
    }
    pending = true
    setError(null)
    try {
      const path = await open({
        directory: false,
        filters: [{extensions: [...options.extensions], name: options.title}],
        multiple: false,
        title: options.title,
      })
      if (path === null || disposed) {
        return undefined
      }
      const [name, bytes] = await Promise.all([basename(path), readFile(path)])
      if (disposed) {
        return undefined
      }
      return new File([bytes], name)
    } catch (cause: unknown) {
      if (!disposed) {
        console.error('Poffo could not read the selected file.', cause)
        setError('파일을 열지 못했습니다.')
      }
      return undefined
    } finally {
      pending = false
    }
  }
  return {dismissError: () => setError(null), error, openFile}
}
