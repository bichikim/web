import {type Accessor, createEffect, createMemo, createSignal} from 'solid-js'

interface UseWebsiteAddressProps {
  readonly value: Accessor<string | undefined>
  readonly available: Accessor<boolean>
  readonly disabled: Accessor<boolean>
  readonly onChange?: (value: string) => void | Promise<void>
}

export const useWebsiteAddress = (props: UseWebsiteAddressProps) => {
  const [local, setLocal] = createSignal('')
  const [draft, setDraft] = createSignal<string | null>(null)
  const [expanded, setExpanded] = createSignal(false)
  const saved = createMemo(() => props.value() ?? local())
  const text = createMemo(() => draft() ?? saved())
  const dismiss = () => setExpanded(false)
  const edit = (text: string) => setDraft(text)
  const show = () => {
    if (!props.disabled() && props.available()) {
      setExpanded(true)
    }
  }
  const commit = () => {
    const address = draft()
    setDraft(null)
    dismiss()
    if (!props.disabled() && address !== null && address !== saved()) {
      setLocal(address)
      return props.onChange?.(address)
    }
  }
  const choose = (address: string) => {
    setDraft(null)
    dismiss()
    setLocal(address)
    return props.onChange?.(address)
  }
  const cancel = () => {
    setDraft(null)
    dismiss()
  }
  createEffect(() => {
    saved()
    setDraft(null)
  })
  createEffect(() => {
    if (props.disabled() || !props.available()) {
      dismiss()
    }
  })
  return {cancel, choose, commit, dismiss, edit, expanded, show, text}
}
