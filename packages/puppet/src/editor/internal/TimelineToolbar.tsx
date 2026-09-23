import {EditorButton, EditorSelect} from '../../design-system'
import {PUPPET_EASINGS, type PuppetEasing} from '../../player/document'
import {TimelineSettingsControls} from './TimelineSettingsControls'
import {TimelineMotionControls} from './TimelineMotionControls'

export interface TimelineToolbarProps {
  readonly canAddKeyframe: boolean
  readonly canDeleteKeyframe: boolean
  readonly easing: PuppetEasing
  readonly framesPerSecond: number
  readonly hasEditableSelection: boolean
  readonly isPlaying?: boolean
  readonly motionIds: ReadonlyArray<string>
  readonly motionId?: string
  readonly onMotionAdd?: () => void
  readonly onMotionChange?: (motionId: string) => void
  readonly onMotionDelete?: () => void
  readonly onMotionDuplicate?: () => void
  readonly onMotionRename?: (name: string) => void
  readonly onEasingChange?: (value: string) => void
  readonly onKeyframeAdd?: () => void
  readonly onKeyframeDelete?: () => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onFramesPerSecondChange?: (framesPerSecond: number) => void
  readonly onPlaybackToggle?: () => void
  readonly selectedKeyframeCount?: number
  readonly titleId: string
}

export const TimelineToolbar = (props: TimelineToolbarProps) => (
  <header class="timeline-toolbar">
    <div class="timeline-label">
      <span id={props.titleId}>Timeline</span>
    </div>
    <div class="timeline-actions">
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
      <TimelineSettingsControls
        framesPerSecond={props.framesPerSecond}
        onEditEnd={props.onEditEnd}
        onEditStart={props.onEditStart}
        onFramesPerSecondChange={props.onFramesPerSecondChange}
      />
      <EditorButton
        class="timeline-playback"
        disabled={props.motionId === undefined || props.onPlaybackToggle === undefined}
        type="button"
        onClick={() => props.onPlaybackToggle?.()}
      >
        {props.isPlaying === false ? '재생' : '정지'}
      </EditorButton>
      <EditorButton
        class="timeline-keyframe-add"
        disabled={!props.canAddKeyframe || props.onKeyframeAdd === undefined}
        type="button"
        onClick={() => props.onKeyframeAdd?.()}
      >
        <span aria-hidden="true" class="puppet-icon puppet-icon-plus" /> 현재 위치에 키프레임
      </EditorButton>
      <EditorButton
        class="timeline-keyframe-delete"
        disabled={!props.canDeleteKeyframe || props.onKeyframeDelete === undefined}
        type="button"
        onClick={() => props.onKeyframeDelete?.()}
      >
        {props.selectedKeyframeCount === undefined || props.selectedKeyframeCount <= 1
          ? '선택 키프레임 삭제'
          : `선택 키프레임 ${props.selectedKeyframeCount}개 삭제`}
      </EditorButton>
      <label class="timeline-easing">
        <span>다음 키프레임까지</span>
        <EditorSelect
          label="키프레임 이징"
          disabled={!props.hasEditableSelection || props.onEasingChange === undefined}
          value={props.easing}
          options={[...PUPPET_EASINGS]}
          onChange={(value) => props.onEasingChange?.(value)}
        />
      </label>
    </div>
  </header>
)
