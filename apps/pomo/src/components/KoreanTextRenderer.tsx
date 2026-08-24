import {Index} from 'solid-js'

import type {KoreanTextSegment} from '../features/korean-text-postprocessor'
import {KoreanTextSegmentView} from './korean-text-renderer/SegmentView'

export interface KoreanTextRendererProps {
  readonly segments: ReadonlyArray<KoreanTextSegment>
}

/** Renders clean text while concealing segments that are still being refined. */
export const KoreanTextRenderer = (props: KoreanTextRendererProps) => (
  <Index each={props.segments}>{(segment) => <KoreanTextSegmentView segment={segment()} />}</Index>
)
