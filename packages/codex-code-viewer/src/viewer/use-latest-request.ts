import {createSignal, onCleanup} from 'solid-js'

export const useLatestRequest = (onError: (error: unknown) => void) => {
  const [pending, setPending] = createSignal(false)
  let sequence = 0
  let disposed = false
  const cancel = (): void => {
    sequence += 1
    setPending(false)
  }
  const run = async <Value>(
    request: () => Promise<Value>,
    onDiscard?: (value: Value) => Promise<void>,
  ): Promise<Value | null> => {
    if (disposed) {
      return null
    }
    sequence += 1
    const ticket = sequence
    setPending(true)
    try {
      const value = await request()
      if (ticket !== sequence) {
        await onDiscard?.(value)
        return null
      }
      return value
    } catch (error) {
      if (ticket === sequence) {
        onError(error)
      }
      return null
    } finally {
      if (ticket === sequence) {
        setPending(false)
      }
    }
  }
  onCleanup(() => {
    disposed = true
    cancel()
  })
  return {cancel, pending, run}
}
