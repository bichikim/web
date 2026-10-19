import {type Accessor, createMemo, createSignal, type JSX, untrack} from 'solid-js'

interface NumberInputOptions {
  readonly value: Accessor<number>
  readonly onCommit: (value: number) => void
}

/** Keeps a numeric draft until Enter or blur; Escape restores the committed value. */
export const useNumberInput = (options: NumberInputOptions) => {
  const [draft, setDraft] = createSignal<string | null>(null)
  const value = createMemo(() => draft() ?? String(options.value()))
  const handleInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) =>
    setDraft(event.currentTarget.value)
  const commit = (): void => {
    const text = draft()
    const number = Number(text)
    if (text !== null && text.trim() !== '' && Number.isFinite(number)) {
      untrack(() => options.onCommit(number))
    }
    setDraft(null)
  }
  const handleKey: JSX.EventHandler<HTMLInputElement, KeyboardEvent> = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commit()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setDraft(null)
    }
  }
  return {handleBlur: commit, handleInput, handleKey, value}
}
