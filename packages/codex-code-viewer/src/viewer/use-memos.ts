import {type Accessor, batch, createSignal, onCleanup} from 'solid-js'
import {INITIAL_MEMOS, type MemoPatch, type MemoState, memoStateSchema} from '../shared/memo-state'
import type {ViewerPort} from './types'

interface UseMemosProps {
  readonly port: Pick<ViewerPort, 'readMemos' | 'saveMemos' | 'addTextContext'>
  readonly onError?: (error: unknown) => void
}
export interface ViewerMemos {
  readonly available: boolean
  readonly visible: Accessor<boolean>
  readonly expanded: Accessor<boolean>
  readonly items: Accessor<readonly string[]>
  readonly loading: Accessor<boolean>
  readonly ready: Accessor<boolean>
  readonly saving: Accessor<boolean>
  readonly attaching: Accessor<string | null>
  readonly canAttach: boolean
  readonly reload: () => Promise<void>
  readonly toggleVisible: () => void
  readonly toggleExpanded: () => void
  readonly add: (text: string) => Promise<boolean>
  readonly edit: (index: number, text: string) => Promise<boolean>
  readonly remove: (index: number) => Promise<boolean>
  readonly attach: (text: string) => Promise<void>
}

export const useMemos = (props: UseMemosProps): ViewerMemos => {
  const available = props.port.readMemos !== undefined && props.port.saveMemos !== undefined
  const [state, setState] = createSignal<MemoState>({...INITIAL_MEMOS, items: []})
  const [loading, setLoading] = createSignal(false)
  const [ready, setReady] = createSignal(false)
  const [saving, setSaving] = createSignal(false)
  const [attaching, setAttaching] = createSignal<string | null>(null)
  let local: MemoPatch = {}
  let disposed = false
  onCleanup(() => {
    disposed = true
  })

  const savePreference = (patch: MemoPatch): void => {
    local = {...local, ...patch}
    setState((previous) => ({...previous, ...patch}))
    if (ready()) {
      props.port.saveMemos?.(patch).catch((error) => props.onError?.(error))
    }
  }
  const reload = async (): Promise<void> => {
    if (!available || loading()) {
      return
    }
    setLoading(true)
    try {
      const snapshot = await props.port.readMemos!()
      if (!disposed) {
        batch(() => {
          setState({...snapshot, ...local})
          setReady(true)
        })
        if (Object.keys(local).length > 0) {
          await props.port.saveMemos!(local)
        }
      }
    } catch (error) {
      props.onError?.(error)
    } finally {
      if (!disposed) {
        setLoading(false)
      }
    }
  }
  const saveItems = async (items: readonly string[]): Promise<boolean> => {
    if (!ready() || saving()) {
      return false
    }
    const parsed = memoStateSchema.shape.items.safeParse(items)
    if (!parsed.success) {
      return false
    }
    setSaving(true)
    try {
      await props.port.saveMemos!({items: parsed.data})
      if (!disposed) {
        setState((previous) => ({...previous, items: parsed.data}))
      }
      return true
    } catch (error) {
      props.onError?.(error)
      return false
    } finally {
      if (!disposed) {
        setSaving(false)
      }
    }
  }
  const edit = (index: number, text: string): Promise<boolean> => {
    const {items} = state()
    return items[index] === undefined
      ? Promise.resolve(false)
      : saveItems(items.with(index, text.trim()))
  }
  const remove = (index: number): Promise<boolean> => {
    const {items} = state()
    return items[index] === undefined
      ? Promise.resolve(false)
      : saveItems(items.toSpliced(index, 1))
  }
  const attach = async (text: string): Promise<void> => {
    if (attaching() !== null || props.port.addTextContext === undefined) {
      return
    }
    setAttaching(text)
    try {
      await props.port.addTextContext(text)
    } catch (error) {
      props.onError?.(error)
    } finally {
      if (!disposed) {
        setAttaching(null)
      }
    }
  }
  reload()
  return {
    add: (text) => saveItems([...state().items, text.trim()]),
    attach,
    attaching,
    available,
    canAttach: props.port.addTextContext !== undefined,
    edit,
    expanded: () => state().expanded,
    items: () => state().items,
    loading,
    ready,
    reload,
    remove,
    saving,
    toggleExpanded: () => savePreference({expanded: !state().expanded}),
    toggleVisible: () => savePreference({visible: !state().visible}),
    visible: () => state().visible,
  }
}
