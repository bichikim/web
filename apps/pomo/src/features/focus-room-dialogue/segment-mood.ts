import type {AnalyzeTextMoodOptions, TextMoodAnalyzer} from '../text-mood'
import type {DialogueSegment} from './schema'

export interface AnalyzeDialogueSegmentMoodsOptions {
  readonly onError?: (error: unknown, segment: DialogueSegment) => void
  readonly onProgress?: (current: number, total: number) => void
  readonly analyzer: Pick<TextMoodAnalyzer, 'analyze'>
  readonly segments: ReadonlyArray<DialogueSegment>
}

const getAnalysisOptions = (
  segment: DialogueSegment,
  previousSegment: DialogueSegment | undefined,
): AnalyzeTextMoodOptions =>
  previousSegment === undefined
    ? {text: segment.text}
    : {context: previousSegment.text, text: segment.text}

/** Enriches dialogue segments sequentially because one mood analyzer accepts one request at a time. */
export const analyzeDialogueSegmentMoods = async (
  options: AnalyzeDialogueSegmentMoodsOptions,
): Promise<ReadonlyArray<DialogueSegment>> => {
  const analyzedSegments: Array<DialogueSegment> = []

  for (const [index, segment] of options.segments.entries()) {
    options.onProgress?.(index + 1, options.segments.length)

    try {
      // oxlint-disable-next-line eslint/no-await-in-loop -- The analyzer rejects overlapping requests and dialogue context is ordered.
      const result = await options.analyzer.analyze(
        getAnalysisOptions(segment, options.segments[index - 1]),
      )

      if (result.ok && result.value.status === 'complete') {
        analyzedSegments.push({...segment, mood: result.value.analysis})
      } else {
        if (!result.ok) {
          options.onError?.(result.error, segment)
        }

        analyzedSegments.push(segment)
      }
    } catch (error: unknown) {
      options.onError?.(error, segment)
      analyzedSegments.push(segment)
    }
  }

  return analyzedSegments
}
