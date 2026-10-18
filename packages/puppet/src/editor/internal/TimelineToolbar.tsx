import {EditorButton, EditorSelect} from '../../design-system'
import {PUPPET_EASINGS, type PuppetEasing} from '../../player/document'
import {TimelineSettingsControls} from './TimelineSettingsControls'
import {TimelineMotionControls} from './TimelineMotionControls'
import {TimelineParameterPicker} from './TimelineParameterPicker'
import type {PuppetParameter} from '../../player'
import {TimelineZoomControls} from './TimelineZoomControls'

export interface TimelineToolbarProps {
  readonly zoom?: number | 'fit'
  readonly onZoomChange?: (zoom: number | 'fit') => void
  readonly easing: PuppetEasing
  readonly framesPerSecond: number
  readonly hasEditableSelection: boolean
  readonly isPlaying?: boolean
  readonly motionIds: ReadonlyArray<string>
  readonly motionId?: string
  readonly availableParameters: ReadonlyArray<PuppetParameter>
  readonly onMotionAdd?: () => void
  readonly onMotionChange?: (motionId: string) => void
  readonly onMotionDelete?: () => void
  readonly onMotionDuplicate?: () => void
  readonly onMotionRename?: (name: string) => void
  readonly onParameterAdd?: (parameterId: string) => void
  readonly onEasingChange?: (value: string) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onFramesPerSecondChange?: (framesPerSecond: number) => void
  readonly onPlaybackToggle?: () => void
  readonly titleId: string
}

export const TimelineToolbar = (props: TimelineToolbarProps) => (
  <header class="timeline-toolbar">
    <div class="timeline-actions">
      <div
        class="timeline-control-group timeline-document-controls"
        role="group"
        aria-label="모션 관리"
      >
        <div class="timeline-label">
          <span id={props.titleId}>Timeline</span>
        </div>
        <TimelineMotionControls
          editableMotionId={props.motionId}
          motionIds={props.motionIds}
          onAdd={props.onMotionAdd}
          onDelete={props.onMotionDelete}
          onDuplicate={props.onMotionDuplicate}
          onRename={props.onMotionRename}
          onViewChange={(value) => props.onMotionChange?.(value)}
          options={props.motionIds}
          value={props.motionId}
        />
        <TimelineParameterPicker
          parameters={props.availableParameters}
          onAdd={props.onParameterAdd}
        />
      </div>
      <div class="timeline-control-group" role="group" aria-label="재생 설정">
        <EditorButton
          aria-label={props.isPlaying === false ? '재생' : '정지'}
          class="timeline-playback timeline-compact-action"
          disabled={props.motionId === undefined || props.onPlaybackToggle === undefined}
          type="button"
          onClick={() => props.onPlaybackToggle?.()}
        >
          <span
            aria-hidden="true"
            class={`puppet-icon ${props.isPlaying === false ? 'puppet-icon-player-play' : 'puppet-icon-player-stop'}`}
          />
          <span class="timeline-action-label">{props.isPlaying === false ? '재생' : '정지'}</span>
        </EditorButton>
        <TimelineSettingsControls
          framesPerSecond={props.framesPerSecond}
          onEditEnd={props.onEditEnd}
          onEditStart={props.onEditStart}
          onFramesPerSecondChange={props.onFramesPerSecondChange}
        />
      </div>
      <div
        class="timeline-control-group timeline-keyframe-controls"
        role="group"
        aria-label="키프레임 편집"
      >
        <label class="timeline-easing">
          <span data-tooltip="다음 키프레임까지의 보간 방식">이징</span>
          <EditorSelect
            label="키프레임 이징"
            disabled={!props.hasEditableSelection || props.onEasingChange === undefined}
            value={props.easing}
            options={[...PUPPET_EASINGS]}
            onChange={(value) => props.onEasingChange?.(value)}
          />
        </label>
      </div>
      <div class="timeline-control-group" role="group" aria-label="타임라인 보기">
        <TimelineZoomControls zoom={props.zoom} onChange={props.onZoomChange} />
      </div>
    </div>
  </header>
)
