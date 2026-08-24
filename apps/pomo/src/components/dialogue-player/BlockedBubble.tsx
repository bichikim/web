import {cx} from 'class-variance-authority'
import type {PSceneStyle} from '../../features/focus-room-animation/index'
import {PScribblePanel} from '../PScribblePanel'
import {CLASSES, getDialogueBubbleShapeClasses} from './shared'

interface BlockedDialogueBubbleProps {
  readonly onRetry: () => void
  readonly sceneStyle?: PSceneStyle
}

export const BlockedDialogueBubble = (props: BlockedDialogueBubbleProps) => (
  <PScribblePanel
    class="pomo-dialogue-bubble-frame flex w-full"
    enabled={props.sceneStyle === 'scribble'}
    frameClass="pomo-dialogue-bubble__scribble-border"
  >
    <button
      class={cx(
        CLASSES.dialogueBubble,
        CLASSES.dialogueBubblePlay,
        getDialogueBubbleShapeClasses(props.sceneStyle),
        'border-highlight bg-surface-interactive',
      )}
      onClick={() => props.onRetry()}
      type="button"
    >
      <span aria-hidden="true" class={CLASSES.dialogueBubblePlayIcon}>
        <span class="i-tabler-volume size-5" />
      </span>
      <span>
        <strong>이벤트 음성 재생</strong>
        <small>브라우저에서 차단된 소리를 시작해요.</small>
      </span>
    </button>
  </PScribblePanel>
)
