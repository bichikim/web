import {createMemo, createSignal} from 'solid-js'
import type {TimelineDopesheetProps} from './TimelineDopesheet'
import {EditorContextMenu} from './EditorContextMenu'
import {KeyedFor} from './KeyedFor'
import {TimelineKeyframeMarker} from './TimelineKeyframeMarker'
import {isKeyframeSelected, snapToFrame} from './timeline-keyframe-selection'
import {useTimelineKeyframes} from './use-timeline-keyframes'
import {type TimelineTrackSource, useTimelineTrack} from './use-timeline-track'
import type {useTimelineKeyframeMovePreview} from './use-timeline-keyframe-move-preview'

export interface TimelineTrackProps
  extends
    TimelineTrackSource,
    Pick<TimelineDopesheetProps, 'onEditEnd' | 'onEditStart' | 'onKeyframeMove'> {
  readonly movePreview: ReturnType<typeof useTimelineKeyframeMovePreview>
  readonly progress: number
  readonly selected: boolean
}

export const TimelineTrack = (props: TimelineTrackProps) => {
  const [element, setElement] = createSignal<HTMLDivElement>()
  const actions = useTimelineTrack({source: () => props})
  const keyframes = useTimelineKeyframes({
    get onMove() {
      return props.onKeyframeMove
    },
    selection: () => props.selection,
    track: () => props.track,
  })
  const menuDisabled = createMemo(
    () => props.onKeyframeAdd === undefined && props.onKeyframesDelete === undefined,
  )
  const move = createMemo(() => (props.onKeyframeMove === undefined ? undefined : keyframes.move))
  const handleCloseAutoFocus = (event: Event) => {
    event.preventDefault()
    if (actions.restoreFocus()) {
      element()?.focus({preventScroll: true})
    }
  }
  return (
    <EditorContextMenu
      entries={actions.contextEntries()}
      label="키프레임 작업"
      disabled={menuDisabled()}
      onOpenChange={actions.handleMenuOpenChange}
      onInteractOutside={actions.handleInteractOutside}
      onCloseAutoFocus={handleCloseAutoFocus}
    >
      <div
        class="timeline-row"
        ref={setElement}
        role="group"
        tabindex="0"
        aria-label={`${props.track.parameter.name} 트랙`}
        aria-keyshortcuts="Backspace Delete"
        data-selected={props.selected ? '' : undefined}
        onClick={actions.handleClick}
        onDblClick={actions.handleDoubleClick}
        onContextMenu={actions.handleContextMenu}
        onKeyDown={actions.handleKeyDown}
      >
        <KeyedFor each={keyframes.views()} key={(view) => String(view.key)}>
          {(view) => (
            <TimelineKeyframeMarker
              duration={props.duration}
              framesPerSecond={props.framesPerSecond}
              getTime={props.getTime}
              keyframe={view().keyframe}
              onContextMenu={() => actions.prepareContextMenu(view().keyframe.time)}
              onEditEnd={props.onEditEnd}
              onEditStart={props.onEditStart}
              onMove={move()}
              onMovePreview={props.movePreview.previewMove}
              onMovePreviewEnd={props.movePreview.endPreview}
              onSelect={props.onKeyframeSelect}
              parameterName={props.track.parameter.name}
              previewTime={props.movePreview.getPreviewTime(
                props.track.parameter.id,
                view().keyframe,
              )}
              selected={isKeyframeSelected(
                props.selection,
                props.track.parameter.id,
                view().keyframe.time,
              )}
              snapTime={(time) => snapToFrame(time, props.duration, props.framesPerSecond)}
              track={props.track}
            />
          )}
        </KeyedFor>
        <span
          aria-hidden="true"
          class="timeline-row-playhead"
          style={{left: `${props.progress}%`}}
        />
      </div>
    </EditorContextMenu>
  )
}
