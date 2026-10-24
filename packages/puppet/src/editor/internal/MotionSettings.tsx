import {Popover} from '@kobalte/core/popover'
import {TextField} from '@kobalte/core/text-field'
import {createSignal, createUniqueId, For, Index, Show} from 'solid-js'

import {
  EditorButton,
  EditorCheckbox,
  EditorNumberField,
  EditorTextInput,
  useEditorPortalMount,
} from '../../design-system'
import type {PuppetDocument, PuppetMotion, PuppetMotionEvent} from '../../player/document'
import {
  getSelectedBezier,
  type MotionSettings as MotionSettingsValue,
  setMotionEvent,
  setMotionSettings,
  setSelectedBezier,
} from './motion-settings'
import type {KeyframeSelection} from './timeline-keyframe-selection'
import {CommitTextField} from './CommitTextField'
import {MotionSoundField} from './MotionSoundField'

export interface MotionSettingsProps {
  readonly currentTime: number
  readonly document: PuppetDocument
  readonly motion?: PuppetMotion
  readonly selection: KeyframeSelection | null
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
}

const FADE_STEP = 0.05
const HANDLE_LABELS = ['핸들 1 시간', '핸들 1 값', '핸들 2 시간', '핸들 2 값'] as const

/** Display name and motion group (Cubism's motion groups). */
const MotionNameFields = (props: {
  readonly disabled: boolean
  readonly motion: PuppetMotion | undefined
  readonly onApply: (changes: MotionSettingsValue) => void
}) => (
  <>
    <label>
      표시 이름
      <CommitTextField
        disabled={props.disabled}
        label="모션 표시 이름"
        placeholder={props.motion?.id}
        value={props.motion?.name ?? ''}
        onCommit={(name) => props.onApply({name})}
      />
    </label>
    <label>
      모션 그룹
      <CommitTextField
        disabled={props.disabled}
        label="모션 그룹"
        placeholder="없음"
        value={props.motion?.group ?? ''}
        onCommit={(group) => props.onApply({group})}
      />
    </label>
  </>
)

/** The motion's events in document order (playback sorts them by time). */
const MotionEventFields = (props: {
  readonly commit: (document: PuppetDocument | undefined) => void
  readonly currentTime: number
  readonly disabled: boolean
  readonly document: PuppetDocument
  readonly motion: PuppetMotion | undefined
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
}) => {
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

/**
 * Name, looping, fades, sound and events of the motion, and the selected keyframe's Bezier
 * handles.
 */
export const MotionSettings = (props: MotionSettingsProps) => {
  const mount = useEditorPortalMount()
  const loopId = createUniqueId()
  const disabled = () => props.motion === undefined || props.onDocumentChange === undefined
  const commit = (document: PuppetDocument | undefined) => {
    if (document !== undefined && !disabled()) {
      props.onDocumentChange?.(document)
    }
  }
  const apply = (changes: MotionSettingsValue) => {
    const motionId = props.motion?.id
    if (motionId !== undefined) {
      commit(setMotionSettings(props.document, motionId, changes))
    }
  }
  const bezier = () => getSelectedBezier(props.motion, props.selection, props.document)

  return (
    <Popover placement="top-start">
      <Popover.Trigger as={EditorButton} disabled={props.motion === undefined}>
        <span aria-hidden="true" class="puppet-icon puppet-icon-motion-settings" />
        <span>모션 설정</span>
      </Popover.Trigger>
      <Popover.Portal mount={mount}>
        <Popover.Content class="motion-settings-popover">
          <header>
            <Popover.Title>모션 설정</Popover.Title>
            <Popover.CloseButton as={EditorButton} aria-label="모션 설정 닫기">
              닫기
            </Popover.CloseButton>
          </header>
          <MotionNameFields disabled={disabled()} motion={props.motion} onApply={apply} />
          <div class="editor-color-row">
            <label for={loopId}>반복 재생</label>
            <EditorCheckbox
              checked={props.motion?.loop ?? true}
              disabled={disabled()}
              inputId={loopId}
              label="반복 재생"
              onChange={(loop) => apply({loop})}
            />
          </div>
          <For each={['fadeInTime', 'fadeOutTime'] as const}>
            {(property) => (
              <label>
                {property === 'fadeInTime' ? '페이드 인' : '페이드 아웃'}
                <EditorNumberField
                  disabled={disabled()}
                  label={`모션 ${property === 'fadeInTime' ? '페이드 인' : '페이드 아웃'}(초)`}
                  minimum={0}
                  name={`motion-${property}`}
                  step={FADE_STEP}
                  unit="s"
                  value={props.motion?.[property] ?? 0}
                  onEditEnd={props.onEditEnd}
                  onEditStart={props.onEditStart}
                  onValueChange={(seconds) => apply({[property]: seconds})}
                />
              </label>
            )}
          </For>
          <MotionSoundField
            disabled={disabled()}
            motionId={props.motion?.id}
            sound={props.motion?.sound}
            onChange={(sound) => apply({sound})}
          />
          <Show when={bezier()}>
            {(handles) => (
              <fieldset class="entry-fields">
                <legend>베지어 핸들</legend>
                <For each={HANDLE_LABELS}>
                  {(label, index) => (
                    <EditorNumberField
                      disabled={disabled()}
                      label={label}
                      name={`bezier-${index()}`}
                      step="any"
                      value={handles()[index()]!}
                      onEditEnd={props.onEditEnd}
                      onEditStart={props.onEditStart}
                      onValueChange={(value) => {
                        const next = [...handles()] as [number, number, number, number]
                        next[index()] = value
                        commit(
                          setSelectedBezier(props.document, props.motion, props.selection, next),
                        )
                      }}
                    />
                  )}
                </For>
              </fieldset>
            )}
          </Show>
          <MotionEventFields
            commit={commit}
            currentTime={props.currentTime}
            disabled={disabled()}
            document={props.document}
            motion={props.motion}
            onEditEnd={props.onEditEnd}
            onEditStart={props.onEditStart}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover>
  )
}
