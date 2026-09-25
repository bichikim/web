import {Tabs} from '@kobalte/core/tabs'
import {createSignal, ErrorBoundary, lazy, Suspense} from 'solid-js'
import * as m from '@paraglide/message'

import {closeDesktopDialog} from '../../features/desktop-mode/dialogs'
import {PMemoryAssistTabList} from '../memory-assist/TabList'
import {PLoadingStatus} from '../p-loading-status/PLoadingStatus'
import {DesktopDialogFrame} from './Frame'

const Content = lazy(() =>
  import('../memory-assist/Content').then((module) => ({default: module.PMemoryAssistContent})),
)

const close = () => {
  closeDesktopDialog('memoryAssist').catch((error: unknown) => {
    console.error('Failed to close the desktop memory assist dialog.', error)
  })
}

export const DesktopMemoryAssistDialog = () => {
  const [activeTab, setActiveTab] = createSignal('sentences')
  const [calendarRevision, setCalendarRevision] = createSignal(0)
  const refreshCalendar = () => setCalendarRevision((revision) => revision + 1)

  return (
    <Tabs class="contents" value={activeTab()} onChange={setActiveTab}>
      <DesktopDialogFrame onClose={close} title={m.memory_assist_title()}>
        <div class="-mx-5 -mt-5 mb-5 h-14 border-b border-solid border-border">
          <PMemoryAssistTabList />
        </div>
        <ErrorBoundary fallback={<p role="alert">{m.modal_content_load_error()}</p>}>
          <Suspense fallback={<PLoadingStatus message={m.modal_content_loading()} />}>
            <Content
              calendarRevision={calendarRevision()}
              onRefreshCalendar={refreshCalendar}
              onRequestClose={close}
            />
          </Suspense>
        </ErrorBoundary>
      </DesktopDialogFrame>
    </Tabs>
  )
}
