import {type Accessor, createEffect, createSignal, on} from 'solid-js'
import type {ViewerConnection} from '../shared/contracts'

/** Initially opens a folder-only connection's tree while retaining later user toggles. */
export const useFileTreeVisibility = (session: Accessor<ViewerConnection | null>) => {
  const [visible, setVisible] = createSignal(false)
  createEffect(
    on(
      () => session()?.session,
      () => {
        const current = session()
        if (current !== null && !('document' in current)) {
          setVisible(true)
        }
      },
    ),
  )
  return {toggle: () => setVisible((previous) => !previous), visible}
}
