import {createEffect, ErrorBoundary, lazy, Suspense, untrack} from 'solid-js'
import {useLocation, useNavigate} from '@solidjs/router'
import * as m from '@paraglide/message'
import {fileTransfer} from 'src/features/file-transfer/session'
import {consumeTransferLink} from 'src/features/file-transfer/consume-link'
import {PModal} from '../p-modal/PModal'
import {PLoadingStatus} from '../p-loading-status/PLoadingStatus'
import {toolsDialog} from './dialog'

const Content = lazy(() => import('../tools/Content').then((module) => ({default: module.Content})))

export const PToolsDialog = () => {
  const location = useLocation()
  const navigate = useNavigate()

  createEffect(() => {
    const link = consumeTransferLink({
      hash: location.hash,
      isConfigured: fileTransfer.isConfigured,
      pathname: location.pathname,
      search: location.search,
    })
    if (link === null) {
      return
    }
    untrack(() => {
      toolsDialog.open({selected: 'transfer'})
      if (link.sessionId !== null) {
        fileTransfer.join(link.sessionId, link.secret)
      }
      navigate(link.replacementUrl, {replace: true, scroll: false})
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
