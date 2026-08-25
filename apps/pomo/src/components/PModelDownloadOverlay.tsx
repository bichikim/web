import {useLocation} from '@solidjs/router'
import {Show} from 'solid-js'

import {PModelDownloadStatus} from './PModelDownloadStatus'
import {isPomoHomePath, normalizePathname} from './pomo-route'

const DIALOGUE_PATH = '/dialogue'
const STATUS_POSITION_CLASSES = [
  'pointer-events-none fixed right-4 top-[calc(1rem+var(--pomo-safe-area-inset-top))]',
  'flex justify-end xs:right-7 lg:top-6',
].join(' ')

export const PModelDownloadOverlay = () => {
  const location = useLocation()
  const shouldShowFloatingStatus = () => {
    const {pathname} = location
    return normalizePathname(pathname) !== DIALOGUE_PATH && !isPomoHomePath(pathname)
  }

  return (
    <Show when={shouldShowFloatingStatus()}>
      <div class={STATUS_POSITION_CLASSES}>
        <PModelDownloadStatus />
      </div>
    </Show>
  )
}
