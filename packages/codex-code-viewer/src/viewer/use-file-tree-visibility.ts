import {type Accessor, createEffect, createMemo, createSignal, on} from 'solid-js'
import type {ViewerConnection} from '../shared/contracts'
import type {ViewerPort} from './types'
import {createBoundedCache} from '../shared/create-bounded-cache'

/** Initially opens a folder-only connection's tree while retaining later user toggles. */
export const useFileTreeVisibility = (
  session: Accessor<ViewerConnection | null>,
  save?: ViewerPort['saveTreeState'],
  onError?: (error: unknown) => void,
) => {
  const [visible, setVisible] = createSignal(false)
  const local = createBoundedCache<boolean>({maxEntries: 16, maxWeight: 16, weight: () => 1})
  const sessionId = createMemo(() => session()?.session)
  createEffect(
    on(sessionId, () => {
      const current = session()
      if (current !== null) {
        const next =
          local.get(current.workspace) ?? current.treeState?.visible ?? !('document' in current)
        local.set(current.workspace, next)
        setVisible(next)
      }
    }),
  )
  const toggle = (): void => {
    const next = !visible()
    setVisible(next)
    const current = session()
    if (current !== null) {
      local.set(current.workspace, next)
      save?.(current.session, {visible: next}).catch((error) => onError?.(error))
    }
  }
  return {toggle, visible}
}
