import {ErrorBoundary, lazy, Suspense} from 'solid-js'
import * as m from '@paraglide/message'

import {closeDesktopDialog} from '../../features/desktop-mode/dialogs'
import {PLoadingStatus} from '../p-loading-status/PLoadingStatus'
import {DesktopDialogFrame} from './Frame'

const Content = lazy(() => import('../tools/Content').then((module) => ({default: module.Content})))

export const DesktopToolsDialog = () => (
  <DesktopDialogFrame
    onClose={() => {
      closeDesktopDialog('tools').catch((error: unknown) => {
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
