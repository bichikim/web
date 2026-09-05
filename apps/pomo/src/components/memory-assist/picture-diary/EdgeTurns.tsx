import {type JSX, Show} from 'solid-js'

import type {PictureDiaryTurnDirection} from './use-page-turn'

export interface PictureDiaryEdgeTurnsProps {
  readonly canGoNewer?: boolean
  readonly canGoOlder?: boolean
  readonly draggingDirection?: PictureDiaryTurnDirection
  readonly onPointerDown: JSX.EventHandler<HTMLDivElement, PointerEvent>
  readonly onSurface: (element: HTMLDivElement) => void
}

export const PictureDiaryEdgeTurns = (props: PictureDiaryEdgeTurnsProps) => (
  <div aria-hidden="true" class="picture-diary-book__edge-turns" ref={props.onSurface}>
    <Show when={props.canGoOlder}>
      <div
        class="picture-diary-book__edge-turn picture-diary-book__edge-turn--older"
        data-dragging={props.draggingDirection === 'older' ? '' : undefined}
        data-picture-diary-edge="older"
        onPointerDown={(event) => props.onPointerDown(event)}
      />
    </Show>
    <Show when={props.canGoNewer}>
      <div
        class="picture-diary-book__edge-turn picture-diary-book__edge-turn--newer"
        data-dragging={props.draggingDirection === 'newer' ? '' : undefined}
        data-picture-diary-edge="newer"
        onPointerDown={(event) => props.onPointerDown(event)}
      />
    </Show>
  </div>
)
