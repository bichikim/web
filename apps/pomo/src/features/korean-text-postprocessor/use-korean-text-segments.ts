import {type Accessor, createMemo} from 'solid-js'

import {createKoreanTextSegments, type KoreanTextSegment} from './logic'

export interface UseKoreanTextSegmentsProps {
  readonly text: Accessor<string>
}

/** Derives renderable Korean text states from the latest generated text. */
export const useKoreanTextSegments = (
  props: UseKoreanTextSegmentsProps,
): Accessor<ReadonlyArray<KoreanTextSegment>> =>
  createMemo(() => createKoreanTextSegments(props.text()))
