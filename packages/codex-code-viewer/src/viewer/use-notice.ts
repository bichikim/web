import {createSignal} from 'solid-js'
import type {Notice} from './types'

export const useNotice = () => {
  const [notice, setNotice] = createSignal<Notice | null>(null)
  const notify = (message: string): void => {
    setNotice({message})
  }
  const dismiss = (): void => {
    setNotice(null)
  }
  return {dismiss, notice, notify}
}
