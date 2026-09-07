import * as m from '@paraglide/message'
import {generateCompressedDialogueAudio} from '../../features/focus-room-dialogue'
import type {LanguageLearningLanguage} from '../../features/language-learning'
import {
  createSupertonicClient,
  getSupertonicErrorMessage,
  type SupertonicModelId,
  type SupertonicVoiceId,
} from '../../features/supertonic'
import {type LanguageLearningCandidate, revokeLanguageLearningAudioUrls} from './candidate'

interface VoiceGenerationOptions {
  readonly isDisposed: () => boolean
  readonly language: LanguageLearningLanguage
  readonly modelId: SupertonicModelId
  readonly onStatus: (message: string) => void
  readonly voiceId: SupertonicVoiceId
}

export interface GenerateVoiceCandidatesOptions extends VoiceGenerationOptions {
  readonly onProgress: (current: number, total: number) => void
  readonly sentences: ReadonlyArray<string>
}

export interface RegenerateCandidateVoiceOptions extends VoiceGenerationOptions {
  readonly candidate: LanguageLearningCandidate
}

interface CancelledVoiceGeneration {
  readonly status: 'cancelled'
}

interface FailedVoiceGeneration {
  readonly message: string
  readonly status: 'error'
}

interface GeneratedVoiceCandidates {
  readonly candidates: ReadonlyArray<LanguageLearningCandidate>
  readonly status: 'complete'
}

interface RegeneratedCandidateVoice {
  readonly candidate: LanguageLearningCandidate
  readonly status: 'complete'
}

export type GenerateVoiceCandidatesResult =
  | CancelledVoiceGeneration
  | FailedVoiceGeneration
  | GeneratedVoiceCandidates

export type RegenerateCandidateVoiceResult =
  | CancelledVoiceGeneration
  | FailedVoiceGeneration
  | RegeneratedCandidateVoice

export const generateVoiceCandidates = async (
  options: GenerateVoiceCandidatesOptions,
): Promise<GenerateVoiceCandidatesResult> => {
  const client = createSupertonicClient()
  const candidates: Array<LanguageLearningCandidate> = []
  let retainedCandidates = false

  try {
    const initialized = await client.initialize({
      modelId: options.modelId,
      onProgress: () => undefined,
      onStatus: options.onStatus,
    })

    if (options.isDisposed()) {
      return {status: 'cancelled'}
    }

    if (!initialized.ok) {
      return {message: getSupertonicErrorMessage(initialized.error), status: 'error'}
    }

    for (const [index, sentence] of options.sentences.entries()) {
      options.onProgress(index + 1, options.sentences.length)
      // oxlint-disable-next-line eslint/no-await-in-loop -- One local voice client generates queued sentences sequentially.
      const generated = await generateCompressedDialogueAudio({
        client,
        language: options.language,
        modelId: options.modelId,
        onChunk: () => undefined,
        text: sentence,
        voiceId: options.voiceId,
      })

      if (options.isDisposed()) {
        return {status: 'cancelled'}
      }

      if (!generated.ok) {
        return {message: generated.message, status: 'error'}
      }

      candidates.push({
        audio: generated.value.audio,
        audioKey: crypto.randomUUID(),
        audioUrl: URL.createObjectURL(generated.value.audio),
        durationMs: generated.value.durationMs,
        id: crypto.randomUUID(),
        modelId: options.modelId,
        segments: generated.value.segments,
        selected: true,
        text: sentence,
        voiceId: options.voiceId,
      })
    }

    retainedCandidates = true
    return {candidates, status: 'complete'}
  } catch (error: unknown) {
    console.error('Failed to generate language learning audio.', error)
    return {message: m.learning_editor_voice_failed(), status: 'error'}
  } finally {
    if (!retainedCandidates) {
      revokeLanguageLearningAudioUrls(candidates)
    }
    client.dispose()
  }
}

export const regenerateCandidateVoice = async (
  options: RegenerateCandidateVoiceOptions,
): Promise<RegenerateCandidateVoiceResult> => {
  const client = createSupertonicClient()

  try {
    const initialized = await client.initialize({
      modelId: options.modelId,
      onProgress: () => undefined,
      onStatus: options.onStatus,
    })

    if (options.isDisposed()) {
      return {status: 'cancelled'}
    }

    if (!initialized.ok) {
      return {message: getSupertonicErrorMessage(initialized.error), status: 'error'}
    }

    const generated = await generateCompressedDialogueAudio({
      client,
      language: options.language,
      modelId: options.modelId,
      onChunk: () => undefined,
      text: options.candidate.text,
      voiceId: options.voiceId,
    })

    if (options.isDisposed()) {
      return {status: 'cancelled'}
    }

    if (!generated.ok) {
      return {message: generated.message, status: 'error'}
    }

    return {
      candidate: {
        ...options.candidate,
        audio: generated.value.audio,
        audioUrl: URL.createObjectURL(generated.value.audio),
        durationMs: generated.value.durationMs,
        modelId: options.modelId,
        segments: generated.value.segments,
        voiceId: options.voiceId,
      },
      status: 'complete',
    }
  } catch (error: unknown) {
    console.error('Failed to regenerate language learning audio.', error)
    return {message: m.learning_editor_voice_failed(), status: 'error'}
  } finally {
    client.dispose()
  }
}
