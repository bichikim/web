import {type Accessor, createEffect, createMemo, createSignal} from 'solid-js'

const DECIMAL_PRECISION = 10

interface UseNumberInputProps {
  readonly value: Accessor<number | undefined>
  readonly min: Accessor<number | undefined>
  readonly max: Accessor<number | undefined>
  readonly step: Accessor<number | undefined>
  readonly disabled: Accessor<boolean>
  readonly onChange?: (value: number) => void | Promise<void>
}

export const useNumberInput = (props: UseNumberInputProps) => {
  const [local, setLocal] = createSignal(0)
  const [draft, setDraft] = createSignal<string | null>(null)
  const value = createMemo(() => props.value() ?? local())
  const text = createMemo(() => draft() ?? String(value()))
  const constrain = (next: number) =>
    Math.min(props.max() ?? Infinity, Math.max(props.min() ?? -Infinity, next))
  const cancel = () => setDraft(null)
  const emit = (next: number) => {
    cancel()
    if (!props.disabled() && next !== value()) {
      setLocal(next)
      return props.onChange?.(next)
    }
  }
  const commit = () => {
    const pending = draft()
    cancel()
    if (pending !== null && pending.trim() !== '' && Number.isFinite(Number(pending))) {
      return emit(constrain(Number(pending)))
    }
  }
  const change = (text: string) => {
    if (!props.disabled()) {
      setDraft(text)
    }
  }
  const step = (direction: -1 | 1) => {
    const pending = Number(text())
    const current = Number.isFinite(pending) ? pending : value()
    return emit(
      constrain(Number((current + direction * (props.step() ?? 1)).toFixed(DECIMAL_PRECISION))),
    )
  }
  createEffect(() => {
    value()
    cancel()
  })
  return {cancel, change, commit, step, text, value}
}
