import type {TextMoodAnalyzer, TextMoodRuntime} from '../../text-mood'
import type {GeneratedDialogueAudio} from '../generate-dialogue-audio'
import {analyzeDialogueSegmentMoods, type AnalyzeDialogueSegmentMoodsOptions} from '../segment-mood'

export interface MoodAnalysisSession {
  analysis: ReturnType<typeof analyzeDialogueSegmentMoods> | null
  analyzer: TextMoodAnalyzer | null
  pendingAudio: GeneratedDialogueAudio | null
}

export const createMoodAnalysisSession = (): MoodAnalysisSession => ({
  analysis: null,
  analyzer: null,
  pendingAudio: null,
})

export const disposeMoodAnalysisSession = (session: MoodAnalysisSession) => {
  session.analyzer?.dispose()
  session.analysis = null
  session.analyzer = null
  session.pendingAudio = null
}

export const getOrCreateMoodAnalyzer = (
  session: MoodAnalysisSession,
  runtime: TextMoodRuntime,
  onProgress: (progress: number) => void,
): TextMoodAnalyzer => (session.analyzer ??= runtime.createAnalyzer({onProgress}))

export const analyzeWithMoodSession = (
  session: MoodAnalysisSession,
  analyzer: TextMoodAnalyzer,
  options: Omit<AnalyzeDialogueSegmentMoodsOptions, 'analyzer'>,
) => {
  const analysis = analyzeDialogueSegmentMoods({...options, analyzer})
  session.analysis = analysis
  return analysis
}

export const waitForPendingMoodAnalysis = async (
  session: MoodAnalysisSession,
  isCurrent: () => boolean,
) => {
  await session.analysis?.then(
    () => undefined,
    () => undefined,
  )
  return isCurrent()
}

export const finishMoodAnalysis = (session: MoodAnalysisSession, audio: GeneratedDialogueAudio) => {
  if (session.pendingAudio === audio) {
    session.analysis = null
    session.pendingAudio = null
  }
}
