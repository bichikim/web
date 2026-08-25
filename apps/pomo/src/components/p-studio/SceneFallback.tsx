import {cx} from 'class-variance-authority'
import * as m from '@paraglide/message'
import {PLoadingStatus} from '../PLoadingStatus'

export const PSceneFallback = () => (
  <div
    aria-live="polite"
    class="pomo-scene-fallback pointer-events-none absolute inset-0 grid place-items-center text-foreground"
    role="status"
  >
    <span class={cx('border border-solid border-border rounded-control backdrop-blur-surface')}>
      <PLoadingStatus message={m.scene_preparing()} />
    </span>
  </div>
)
