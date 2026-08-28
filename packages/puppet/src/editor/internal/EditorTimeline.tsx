import {createUniqueId} from 'solid-js'

import type {PuppetDocument} from '../../player/document'

export interface EditorTimelineProps {
  readonly document: PuppetDocument
}

export const EditorTimeline = (props: EditorTimelineProps) => {
  const titleId = createUniqueId()

  return (
    <section class="timeline" aria-labelledby={titleId}>
      <div class="timeline-label">
        <span>Timeline</span>
        <strong id={titleId}>{props.document.motions[0]?.id ?? 'Static mesh'}</strong>
      </div>
      <div class="timeline-track" aria-hidden="true">
        <span class="timeline-line" />
        <i class="keyframe keyframe-start" />
        <i class="keyframe keyframe-center" />
        <i class="keyframe keyframe-end" />
        <span class="playhead" />
      </div>
      <span class="timeline-time">JSON → PLAYER</span>
    </section>
  )
}
