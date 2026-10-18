import {Tabs} from '@kobalte/core/tabs'
import {createSignal, ErrorBoundary, lazy, Suspense} from 'solid-js'
import * as m from '@paraglide/message'

import {closeDesktopDialog} from '../../features/desktop-mode/dialogs'
import {PMemoryAssistTabList} from '../memory-assist/TabList'
import {PLoadingStatus} from '../p-loading-status/PLoadingStatus'
import {DesktopDialogFrame} from './Frame'
import {getLocale} from '@paraglide/runtime'
import {useTarotReading, useTarotSpeech} from '../../features/tarot'
import {useSajuReading} from '../../features/saju'

const Content = lazy(() =>
  import('../memory-assist/Content').then((module) => ({default: module.PMemoryAssistContent})),
)

const close = () => {
  closeDesktopDialog('memoryAssist').catch((error: unknown) => {
    console.error('Failed to close the desktop memory assist dialog.', error)
  })
}

export const DesktopMemoryAssistDialog = () => {
  const tarot = useTarotReading({locale: getLocale})
  const saju = useSajuReading()
  const tarotSpeech = useTarotSpeech({
    locale: getLocale,
    text: () => (tarot.status() === 'complete' ? tarot.output() : ''),
  })
  const [activeTab, setActiveTab] = createSignal('sentences')
  const [calendarRevision, setCalendarRevision] = createSignal(0)
  const refreshCalendar = () => setCalendarRevision((revision) => revision + 1)
  const handleClose = () => {
    tarot.cancel()
    saju.cancel()
    close()
  }
  const handleTabChange = (value: string) => {
    if (value !== 'tarot') {
      tarot.cancel()
    }
    if (value !== 'saju') {
      saju.cancel()
    }
    setActiveTab(value)
  }

  return (
    <Tabs class="contents" value={activeTab()} onChange={handleTabChange}>
      <DesktopDialogFrame onClose={handleClose} title={m.memory_assist_title()}>
        <div class="-mx-5 -mt-5 mb-5 h-14 border-b border-solid border-border">
          <PMemoryAssistTabList />
        </div>
        <ErrorBoundary fallback={<p role="alert">{m.modal_content_load_error()}</p>}>
          <Suspense fallback={<PLoadingStatus message={m.modal_content_loading()} />}>
            <Content
              tarot={tarot}
              tarotSpeech={tarotSpeech}
              saju={saju}
              calendarRevision={calendarRevision()}
              onRefreshCalendar={refreshCalendar}
            />
          </Suspense>
        </ErrorBoundary>
      </DesktopDialogFrame>
    </Tabs>
  )
}
