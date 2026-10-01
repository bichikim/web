import {createEffect, ErrorBoundary, lazy, Suspense, untrack} from 'solid-js'
import {useLocation, useNavigate} from '@solidjs/router'
import * as m from '@paraglide/message'
import {fileTransfer} from 'src/features/file-transfer/session'
import {PModal} from '../p-modal/PModal'
import {PLoadingStatus} from '../p-loading-status/PLoadingStatus'
import {toolsDialog} from './dialog'

const Content = lazy(() => import('../tools/Content').then((module) => ({default: module.Content})))

export const PToolsDialog = () => {
  const location = useLocation()
  const navigate = useNavigate()

  createEffect(() => {
    const parameters = new URLSearchParams(location.search)
    if (parameters.get('tool') !== 'transfer' || !fileTransfer.isConfigured) {
      return
    }
    const sessionId = parameters.get('session')
    const secret = location.hash.slice(1)
    const {pathname} = location
    const hash = sessionId === null ? location.hash : ''
    parameters.delete('tool')
    parameters.delete('session')
    const search = parameters.size === 0 ? '' : `?${parameters.toString()}`
    untrack(() => {
      toolsDialog.open({selected: 'transfer'})
      if (sessionId !== null) {
        fileTransfer.join(sessionId, secret)
      }
      navigate(`${pathname}${search}${hash}`, {replace: true, scroll: false})
    })
  })

  return (
    <PModal
      isOpen={toolsDialog.isOpen()}
      onOpenChange={toolsDialog.onOpenChange}
      onCloseAutoFocus={toolsDialog.restoreFocus}
      title={m.tools_open()}
      description={m.tools_description()}
      placement="top"
      size="expanded"
    >
      <ErrorBoundary fallback={<p role="alert">{m.modal_content_load_error()}</p>}>
        <Suspense fallback={<PLoadingStatus message={m.modal_content_loading()} />}>
          <Content
            selected={toolsDialog.selected()}
            onSelectedChange={toolsDialog.onSelectedChange}
          />
        </Suspense>
      </ErrorBoundary>
    </PModal>
  )
}
