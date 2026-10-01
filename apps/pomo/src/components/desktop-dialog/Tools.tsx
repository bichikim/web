import {ErrorBoundary, lazy, onCleanup, onMount, Suspense} from 'solid-js'
import * as m from '@paraglide/message'
import type {CloseRequestedEvent} from '@tauri-apps/api/window'

import {closeDesktopDialog} from '../../features/desktop-mode/dialogs'
import {fileTransfer} from '../../features/file-transfer/session'
import {PLoadingStatus} from '../p-loading-status/PLoadingStatus'
import {DesktopDialogFrame} from './Frame'

const Content = lazy(() => import('../tools/Content').then((module) => ({default: module.Content})))

const closeToolsDialog = async (): Promise<void> => {
  if (fileTransfer.isActive) {
    const {getCurrentWindow} = await import('@tauri-apps/api/window')
    await getCurrentWindow().hide()
    return
  }
  await closeDesktopDialog('tools')
}

const handleNativeClose = (event: CloseRequestedEvent): void => {
  if (!fileTransfer.isActive) {
    return
  }
  event.preventDefault()
  import('@tauri-apps/api/window')
    .then(({getCurrentWindow}) => getCurrentWindow().hide())
    .catch((error: unknown) => {
      console.error('Failed to hide the desktop tools dialog.', error)
    })
}

export const DesktopToolsDialog = () => {
  onMount(() => {
    if (import.meta.env.VITE_POMO_IS_DESKTOP !== 'true') {
      return
    }
    let unlisten: (() => void) | undefined
    let disposed = false
    import('@tauri-apps/api/window')
      .then(({getCurrentWindow}) => getCurrentWindow().onCloseRequested(handleNativeClose))
      .then((listener) => {
        if (disposed) {
          listener()
        } else {
          unlisten = listener
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to watch the desktop tools dialog.', error)
      })
    onCleanup(() => {
      disposed = true
      unlisten?.()
    })
  })

  return (
    <DesktopDialogFrame
      onClose={() => {
        closeToolsDialog().catch((error: unknown) => {
          console.error('Failed to close the desktop tools dialog.', error)
        })
      }}
      title={m.tools_open()}
    >
      <ErrorBoundary fallback={<p role="alert">{m.modal_content_load_error()}</p>}>
        <Suspense fallback={<PLoadingStatus message={m.modal_content_loading()} />}>
          <Content />
        </Suspense>
      </ErrorBoundary>
    </DesktopDialogFrame>
  )
}
