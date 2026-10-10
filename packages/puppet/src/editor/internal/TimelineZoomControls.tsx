import {EditorSelect} from '../../design-system'
const DEFAULT_ZOOM = 100

interface TimelineZoomControlsProps {
  readonly zoom?: number | 'fit'
  readonly onChange?: (zoom: number | 'fit') => void
}

export const TimelineZoomControls = (props: TimelineZoomControlsProps) => (
  <label class="timeline-easing">
    <span>확대</span>
    <EditorSelect
      label="타임라인 확대율"
      options={['fit', '25', '50', '100', '200', '400']}
      optionLabel={(value) => (value === 'fit' ? '전체 맞춤' : `${value}%`)}
      value={String(props.zoom ?? DEFAULT_ZOOM)}
      disabled={props.onChange === undefined}
      onChange={(value) => props.onChange?.(value === 'fit' ? 'fit' : Number(value))}
    />
  </label>
)
