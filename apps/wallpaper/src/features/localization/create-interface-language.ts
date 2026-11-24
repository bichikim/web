import {createSignal} from 'solid-js'
import type {InterfaceLanguage, InterfaceLanguagePort} from './types'

export const createInterfaceLanguage = (port: InterfaceLanguagePort) => {
  const [language, setLanguage] = createSignal<InterfaceLanguage>('ko')
  const [pending, setPending] = createSignal(0)
  const [error, setError] = createSignal<string | null>(null)
  let revision = 0
  let queue = Promise.resolve()
  const receive = (next: InterfaceLanguage) => {
    revision += 1
    setLanguage(next)
    setError(null)
  }
  const start = async () => {
    let active = true
    let unsubscribe: (() => void) | null = null
    const original = revision
    try {
      unsubscribe = await port.listen((next) => {
        if (active) {
          receive(next)
        }
      })
      const saved = await port.read()
      if (active && revision === original) {
        setLanguage(saved)
      }
    } catch (cause) {
      console.error('Could not load interface language', cause)
      setError('언어 설정을 불러오지 못했어요.')
    }
    return () => {
      active = false
      unsubscribe?.()
    }
  }
  const persist = async (next: InterfaceLanguage, original: number) => {
    try {
      await port.save(next)
      if (revision === original) {
        setLanguage(next)
      }
    } catch (cause) {
      console.error('Could not save interface language', cause)
      if (revision === original) {
        setError('언어 설정을 저장하지 못했어요.')
      }
    } finally {
      setPending((count) => count - 1)
    }
  }
  const change = (next: InterfaceLanguage) => {
    revision += 1
    const original = revision
    setPending((count) => count + 1)
    setError(null)
    queue = queue.then(persist.bind(undefined, next, original))
    return queue
  }
  return {busy: () => pending() > 0, change, error, language, start}
}
