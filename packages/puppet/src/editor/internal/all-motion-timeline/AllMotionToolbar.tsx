import {EditorSelect} from '../../../design-system'
import {PUPPET_EASINGS, type PuppetEasing} from '../../../player/document'
import {TimelineSettingsControls} from '../TimelineSettingsControls'
import {TimelineMotionControls} from '../TimelineMotionControls'
import {TimelineZoomControls} from '../TimelineZoomControls'
import {ALL_MOTIONS_OPTION} from './options'

export interface AllMotionToolbarProps {
  readonly zoom?: number | 'fit'
  readonly onZoomChange?: (zoom: number | 'fit') => void
  readonly easing: PuppetEasing
  readonly framesPerSecond: number
  readonly hasEditableSelection: boolean
  readonly motionIds: ReadonlyArray<string>
  readonly onMotionAdd?: () => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onFramesPerSecondChange?: (framesPerSecond: number) => void
  readonly onEasingChange?: (value: string) => void
  readonly onViewChange: (value: string) => void
  readonly titleId: string
}

export const AllMotionToolbar = (props: AllMotionToolbarProps) => (
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
          motionIds={props.motionIds}
          onAdd={props.onMotionAdd}
          onViewChange={props.onViewChange}
          options={[ALL_MOTIONS_OPTION, ...props.motionIds]}
          value={ALL_MOTIONS_OPTION}
        />
      </div>
      <div class="timeline-control-group" role="group" aria-label="재생 설정">
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
