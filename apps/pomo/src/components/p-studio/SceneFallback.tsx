import * as m from '@paraglide/message'
import {PLoadingStatus} from '../PLoadingStatus'

export const PSceneFallback = () => (
  <div aria-live="polite" class="pomo-scene-fallback" role="status">
    <span class="pomo-scene-fallback__panel">
      <PLoadingStatus message={m.scene_preparing()} />
    </span>
  </div>
)
