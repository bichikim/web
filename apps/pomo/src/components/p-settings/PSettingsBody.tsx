import * as m from '@paraglide/message'
import {ErrorBoundary, lazy, Suspense} from 'solid-js'
import type {ScreenWakeLockController} from 'src/features/screen-wake-lock'
import {PLoadingStatus} from '../p-loading-status/PLoadingStatus'
import type {PSettingsProps} from '../settings/types'

const PSettingsContent = lazy(async () => {
  try {
    const module = await import('../settings/Content')
    return {default: module.PSettingsContent}
  } catch (error) {
    // Preload must settle so module failures reach the modal's error boundary.
    return {
      default: () => {
        throw error
      },
    }
  }
})

export interface PSettingsBodyProps extends PSettingsProps {
  readonly wakeLock: ScreenWakeLockController
}

export const preloadSettingsContent = () => PSettingsContent.preload()

export const PSettingsBody = (props: PSettingsBodyProps) => (
  <ErrorBoundary fallback={<p role="alert">{m.modal_content_load_error()}</p>}>
    <Suspense
      fallback={
        <div role="status">
          <PLoadingStatus message={m.modal_content_loading()} />
        </div>
      }
    >
      <PSettingsContent {...props} />
    </Suspense>
  </ErrorBoundary>
)
