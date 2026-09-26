import {replaceObjectUrl} from 'src/features/blob-object-url'
import * as m from '@paraglide/message'
import {generateCompressedDialogueAudio} from '../../features/focus-room-dialogue'
import type {LanguageLearningLanguage} from '../../features/language-learning'
import {
  getSupertonicErrorMessage,
  type SupertonicModelId,
  type SupertonicVoiceId,
} from '../../features/supertonic'
import {type LanguageLearningCandidate, revokeLanguageLearningAudioUrls} from './candidate'
import {runLanguageLearningSupertonic} from './supertonic-lifecycle'

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
  const candidates: Array<LanguageLearningCandidate> = []
  let retainedCandidates = false

  try {
    const result = await runLanguageLearningSupertonic<GenerateVoiceCandidatesResult>({
      isCancelled: options.isDisposed,
      modelId: options.modelId,
      onProgress: () => undefined,
      onStatus: options.onStatus,
      run: async (client) => {
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

        return {candidates, status: 'complete'}
      },
    })

    switch (result.status) {
      case 'cancelled':
        return result
      case 'initialization-error':
        return {message: getSupertonicErrorMessage(result.error), status: 'error'}
      case 'complete':
        retainedCandidates = result.value.status === 'complete'
        return result.value
    }
  } catch (error: unknown) {
    console.error('Failed to generate language learning audio.', error)
    return {message: m.learning_editor_voice_failed(), status: 'error'}
  } finally {
    if (!retainedCandidates) {
      revokeLanguageLearningAudioUrls(candidates)
    }
  }
}

export const regenerateCandidateVoice = async (
  options: RegenerateCandidateVoiceOptions,
): Promise<RegenerateCandidateVoiceResult> => {
  try {
    const result = await runLanguageLearningSupertonic<RegenerateCandidateVoiceResult>({
      isCancelled: options.isDisposed,
      modelId: options.modelId,
      onProgress: () => undefined,
      onStatus: options.onStatus,
      run: async (client) => {
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
            audioUrl: replaceObjectUrl(options.candidate.audioUrl, () => generated.value.audio, {
              create: (audio) => URL.createObjectURL(audio),
              order: 'create-first',
              revoke: (url) => URL.revokeObjectURL(url),
            }),
            durationMs: generated.value.durationMs,
            modelId: options.modelId,
            segments: generated.value.segments,
            voiceId: options.voiceId,
          },
          status: 'complete',
        }
      },
    })

    switch (result.status) {
      case 'cancelled':
        return result
      case 'initialization-error':
        return {message: getSupertonicErrorMessage(result.error), status: 'error'}
      case 'complete':
        return result.value
    }
  } catch (error: unknown) {
    console.error('Failed to regenerate language learning audio.', error)
    return {message: m.learning_editor_voice_failed(), status: 'error'}
  }
}
