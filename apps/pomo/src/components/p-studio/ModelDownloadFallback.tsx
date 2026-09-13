import {Show} from 'solid-js'

import {PModelDownloadStatus} from '../p-model-download-status/PModelDownloadStatus'
import {CLASSES} from './shared'

export interface SceneModelDownloadFallbackProps {
  readonly isVisible: boolean
}

export const SceneModelDownloadFallback = (props: SceneModelDownloadFallbackProps) => (
  <Show when={props.isVisible}>
    <div class={CLASSES.sceneToolbar}>
      <PModelDownloadStatus />
    </div>
  </Show>
)
