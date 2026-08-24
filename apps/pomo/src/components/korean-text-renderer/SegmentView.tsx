import {Show} from 'solid-js'
import type {KoreanTextSegment} from '../../features/korean-text-postprocessor/index'
import {RefinementIndicator} from './RefinementIndicator'

interface KoreanTextSegmentViewProps {
  readonly segment: KoreanTextSegment
}

export const KoreanTextSegmentView = (props: KoreanTextSegmentViewProps) => (
  <Show fallback={<RefinementIndicator />} when={props.segment.kind === 'text'}>
    {props.segment.text}
  </Show>
)
