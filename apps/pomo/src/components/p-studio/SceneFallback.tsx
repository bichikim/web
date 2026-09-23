import * as m from '@paraglide/message'
import {PLoadingStatus} from '../p-loading-status/PLoadingStatus'

const SCENE_FALLBACK_CLASSES =
  'pointer-events-none absolute inset-0 grid place-items-center text-foreground'
const SCENE_FALLBACK_PANEL_CLASSES =
  'border border-solid border-border rounded-control backdrop-blur-surface'

export const PSceneFallback = () => (
  <div aria-live="polite" class={SCENE_FALLBACK_CLASSES} role="status">
    <span class={SCENE_FALLBACK_PANEL_CLASSES}>
      <PLoadingStatus message={m.scene_preparing()} />
    </span>
  </div>
)
