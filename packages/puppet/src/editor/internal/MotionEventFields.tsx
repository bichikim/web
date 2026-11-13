import {Index} from 'solid-js'
import {EditorButton, EditorNumberField} from '../../design-system'
import type {PuppetDocument, PuppetMotion, PuppetMotionEvent} from '../../player/document'
import {setMotionEvent, setMotionSettings} from './motion-settings'
import {CommitTextField} from './CommitTextField'

interface MotionEventFieldsProps {
  readonly commit: (document: PuppetDocument | undefined) => void
  readonly currentTime: number
  readonly disabled: boolean
  readonly document: PuppetDocument
  readonly motion: PuppetMotion | undefined
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
}

/** The motion's events in document order (playback sorts them by time). */
export const MotionEventFields = (props: MotionEventFieldsProps) => {
  const events = () => props.motion?.events ?? []
  const apply = (next: ReadonlyArray<PuppetMotionEvent>) => {
    const motionId = props.motion?.id
    if (motionId !== undefined) {
      props.commit(setMotionSettings(props.document, motionId, {events: next}))
    }
  }
  const setEvent = (index: number, change: Partial<PuppetMotionEvent>) => {
    const motionId = props.motion?.id
    if (motionId !== undefined) {
      props.commit(setMotionEvent(props.document, motionId, index, change))
    }
  }
  return (
    <fieldset class="entry-fields">
      <legend>이벤트</legend>
      {/*
        Events have no ID; rows are addressed by position so edits keep them mounted. A time edit
        does not reorder them (playback sorts events itself), so every row keeps its event.
      */}
      <Index each={events()}>
        {(event, index) => (
          <div class="editor-color-row">
            <EditorNumberField
              disabled={props.disabled}
              label={`이벤트 ${index + 1} 시간`}
              maximum={props.motion?.duration}
              minimum={0}
              name={`motion-event-${index}`}
              step="any"
              unit="s"
              value={event().time}
              onEditEnd={props.onEditEnd}
              onEditStart={props.onEditStart}
              onValueChange={(time) => setEvent(index, {time})}
            />
            <CommitTextField
              disabled={props.disabled}
              label={`이벤트 ${index + 1} 값`}
              value={event().value}
              onCommit={(value) => setEvent(index, {value})}
            />
            <EditorButton
              aria-label={`이벤트 ${index + 1} 삭제`}
              disabled={props.disabled}
              onClick={() => apply(events().filter((_, at) => at !== index))}
            >
              <span aria-hidden="true" class="puppet-icon puppet-icon-trash" />
            </EditorButton>
          </div>
        )}
      </Index>
      <EditorButton
        disabled={props.disabled}
        onClick={() => apply([...events(), {time: props.currentTime, value: 'event'}])}
      >
        <span aria-hidden="true" class="puppet-icon puppet-icon-plus" />
        현재 시간에 이벤트 추가
      </EditorButton>
    </fieldset>
  )
}
