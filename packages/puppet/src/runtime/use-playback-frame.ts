import {type Accessor, createSignal} from 'solid-js'
import type {PlayerFrame, PuppetDocument} from '../player'
interface PlaybackSnapshot {
  readonly document: PuppetDocument | undefined
  readonly frame: PlayerFrame
}
/** Retains a playback position only while the document and selected motion still match. */
export const usePlaybackFrame = (
  document: Accessor<PuppetDocument | undefined>,
  motionId: Accessor<string | undefined>,
) => {
  const [snapshot, setSnapshot] = createSignal<PlaybackSnapshot>()
  return {
    frame: () => snapshot()?.frame ?? null,
    resetFrame: () => setSnapshot(undefined),
    resumeTime: () => {
      const current = snapshot()
      return current?.document === document() && current?.frame.motionId === motionId()
        ? current?.frame.time
        : undefined
    },
    updateFrame: (frame: PlayerFrame) => setSnapshot({document: document(), frame}),
  }
}
