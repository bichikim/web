import {EditorNumberField} from '../../design-system'
import {
  MAXIMUM_PUPPET_FRAMES_PER_SECOND,
  MINIMUM_PUPPET_FRAMES_PER_SECOND,
} from '../../player/document'

export interface TimelineSettingsControlsProps {
  readonly duration?: number
  readonly durationLabel?: string
  readonly durationMinimum?: number
  readonly framesPerSecond: number
  readonly onDurationChange?: (duration: number) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onFramesPerSecondChange?: (framesPerSecond: number) => void
  readonly showDurationLabel?: boolean
  readonly showFramesPerSecond?: boolean
}

export const TimelineSettingsControls = (props: TimelineSettingsControlsProps) => (
  <div class="timeline-settings">
    {props.duration === undefined ? null : (
      <label class="timeline-setting">
        {props.showDurationLabel === false ? null : <span>길이</span>}
        <EditorNumberField
          disabled={props.onDurationChange === undefined}
          label={props.durationLabel ?? '모션 길이'}
          minimum={props.durationMinimum}
          onEditEnd={props.onEditEnd}
          onEditStart={props.onEditStart}
          step={1 / props.framesPerSecond}
          unit="s"
          value={props.duration}
          onValueChange={props.onDurationChange}
        />
      </label>
    )}
    {props.showFramesPerSecond === false ? null : (
      <label class="timeline-setting">
        <span>FPS</span>
        <EditorNumberField
          disabled={props.onFramesPerSecondChange === undefined}
          label="타임라인 FPS"
          maximum={MAXIMUM_PUPPET_FRAMES_PER_SECOND}
          minimum={MINIMUM_PUPPET_FRAMES_PER_SECOND}
          onEditEnd={props.onEditEnd}
          onEditStart={props.onEditStart}
          step={1}
          unit="fps"
          value={props.framesPerSecond}
          onValueChange={props.onFramesPerSecondChange}
        />
      </label>
    )}
  </div>
)
