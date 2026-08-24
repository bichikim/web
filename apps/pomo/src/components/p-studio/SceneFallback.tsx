import {cx} from 'class-variance-authority'
import {CLASSES} from './shared'

export const PSceneFallback = () => (
  <div
    aria-live="polite"
    class="pomo-scene-fallback pointer-events-none absolute inset-0 grid place-items-center text-foreground"
    role="status"
  >
    <span class={cx('border border-solid border-border backdrop-blur-surface', CLASSES.loading)}>
      <span aria-hidden="true" class={CLASSES.loadingSpinner} />
      장면 준비 중…
    </span>
  </div>
)
