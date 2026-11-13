import {preventInternalDismiss} from '../../design-system/prevent-internal-dismiss'
import {Popover} from '@kobalte/core/popover'
import {createUniqueId, For, Show} from 'solid-js'
import {
  EditorButton,
  EditorCheckbox,
  EditorNumberField,
  useEditorPortalMount,
} from '../../design-system'
import type {PuppetDocument, PuppetMotion} from '../../player/document'
import {
  getSelectedBezier,
  type MotionSettings as MotionSettingsValue,
  setMotionSettings,
  setSelectedBezier,
} from './motion-settings'
import type {KeyframeSelection} from './timeline-keyframe-selection'
import {MotionSoundField} from './MotionSoundField'
import {MotionNameFields} from './MotionNameFields'
import {MotionEventFields} from './MotionEventFields'

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

/**
 * Name, looping, fades, sound and events of the motion, and the selected keyframe's Bezier
 * handles.
 */
export const MotionSettings = (props: MotionSettingsProps) => {
  let surface: HTMLDivElement | undefined

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
        <Popover.Content
          ref={(element) => {
            surface = element
          }}
          onInteractOutside={(event) => preventInternalDismiss(event, surface)}
          class="motion-settings-popover"
        >
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
