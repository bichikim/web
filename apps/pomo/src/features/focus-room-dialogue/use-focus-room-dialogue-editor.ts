import * as m from '@paraglide/message'
import {createEffect, createMemo, createSignal, on, onCleanup, untrack} from 'solid-js'
import {isNonBlankString} from 'src/utils/is-non-blank-string'
import {replaceBlobObjectUrl} from '../blob-object-url'

import {
  createOpusBlob,
  type SupertonicClient,
  type SupertonicLanguage,
  type SupertonicModelId,
  type SupertonicVoiceId,
} from '../supertonic'
import {createTextMoodAnalyzer, type TextMoodAnalyzer} from '../text-mood'
import {
  deleteDialogueDraft,
  getDialogueDraftKey,
  readDialogueDraft,
  writeDialogueDraft,
} from './dialogue-draft'
import {createDialogueEditorAudioState} from './dialogue-editor-audio-state'
import {createDialogueModelSession} from './use-focus-room-dialogue-editor/model-session'
import type {PDialogueEditorController, UsePDialogueEditorProps} from './dialogue-editor-contract'
import {type DialogueEditorState, isDialogueEditorBusy} from './dialogue-editor-state'
import {
  createDialogueAudioPreview,
  createDialogueAudioSamples,
  generateDialogueAudio,
  regenerateDialogueSegmentAudio,
} from './dialogue-audio-runtime'
import type {GeneratedDialogueAudio} from './generate-dialogue-audio'
import {createPDialogueRepository} from './repository'
import {DEFAULT_FOCUS_ROOM_DIALOGUE_LANGUAGE, type PDialogue} from './schema'
import {analyzeDialogueSegmentMoods} from './segment-mood'

const MAXIMUM_PROGRESS = 100
const DEFAULT_MODEL_ID: SupertonicModelId = 'full'
const DEFAULT_VOICE_ID: SupertonicVoiceId = 'Yuna'

export type {DialogueEditorState} from './dialogue-editor-state'
export type {PDialogueEditorController, UsePDialogueEditorProps} from './dialogue-editor-contract'

interface DialogueAudioRequest {
  readonly client: SupertonicClient
  readonly language: SupertonicLanguage
  readonly modelId: SupertonicModelId
  readonly text: string
  readonly voiceId: SupertonicVoiceId
}

const createSpeechSelection = () => {
  const [language, setLanguage] = createSignal<SupertonicLanguage>(
    DEFAULT_FOCUS_ROOM_DIALOGUE_LANGUAGE,
  )
  const [modelId, setModelId] = createSignal<SupertonicModelId>(DEFAULT_MODEL_ID)
  const [voiceId, setVoiceId] = createSignal<SupertonicVoiceId>(DEFAULT_VOICE_ID)
  return {language, modelId, setLanguage, setModelId, setVoiceId, voiceId}
}

const getGenerationKey = (
  language: SupertonicLanguage,
  modelId: SupertonicModelId,
  voiceId: SupertonicVoiceId,
  text: string,
) => `${language}\u0000${modelId}\u0000${voiceId}\u0000${text.trim()}`

/** Owns the browser-only lifecycle for editing, generating and persisting a dialogue. */
// oxlint-disable-next-line eslint/max-lines-per-function -- The editor hook owns one disposable model, audio URL and persistence lifecycle.
export const usePDialogueEditor = (props: UsePDialogueEditorProps): PDialogueEditorController => {
  const initialDialogueId = untrack(props.dialogueId)
  const moodRuntime = untrack(() => props.moodRuntime ?? {createAnalyzer: createTextMoodAnalyzer})
  let draftKey = getDialogueDraftKey(initialDialogueId)
  let routeRevision = 0
  const repository = createPDialogueRepository()
  const [dialogueId, setDialogueId] = createSignal<string | null>(initialDialogueId)
  const [text, setText] = createSignal('')
  const {
    language,
    modelId,
    setLanguage: setLanguageSignal,
    setModelId: setModelIdSignal,
    setVoiceId: setVoiceIdSignal,
    voiceId,
  } = createSpeechSelection()
  const {
    abortOpusEncoding,
    audioUrl,
    durationMs,
    editableAudio,
    opusEncodingSignal,
    regeneratingSegmentIndex,
    segments,
    setAudioUrl,
    setDurationMs,
    setEditableAudio,
    setRegeneratingSegmentIndex,
    setSegments,
  } = createDialogueEditorAudioState()
  const [state, setState] = createSignal<DialogueEditorState>({
    message: initialDialogueId === null ? m.dialogue_status_initial() : m.dialogue_status_loading(),
    status: initialDialogueId === null ? 'idle' : 'loading',
  })
  let audioBlob: Blob | null = null
  let audioKey: string | null = null
  let audioNeedsWrite = false
  let createdAt: string | null = null
  let generatedKey: string | null = null
  let isDisposed = false
  let moodAnalyzer: TextMoodAnalyzer | null = null

  const setEditorState = (nextState: DialogueEditorState) => {
    if (!isDisposed) {
      setState(nextState)
    }
  }
  const modelSession = createDialogueModelSession({
    isDisposed: () => isDisposed,
    setState: setEditorState,
    state,
  })
  const isBusy = createMemo(() => isDialogueEditorBusy(state()))
  const currentGenerationKey = () => getGenerationKey(language(), modelId(), voiceId(), text())
  const hasCurrentAudio = () => audioBlob !== null && generatedKey === currentGenerationKey()
  const canGenerate = createMemo(() => !isBusy() && isNonBlankString(text()))
  const canRegenerateSegments = createMemo(
    () => !isBusy() && editableAudio() !== null && hasCurrentAudio(),
  )
  const canSave = createMemo(() => !isBusy() && hasCurrentAudio() && segments().length > 0)
  const progress = createMemo(() => {
    const currentState = state()
    return currentState.status === 'preparing'
      ? currentState.progress
      : modelSession.getPreparedModelId() === modelId()
        ? MAXIMUM_PROGRESS
        : 0
  })

  const replaceAudio = (blob: Blob | null) => {
    if (isDisposed) {
      return
    }

    setAudioUrl(
      replaceBlobObjectUrl(audioUrl(), () => {
        audioBlob = blob
        return blob
      }),
    )
  }
  const clearGeneratedAudio = (message: string | null = null) => {
    replaceAudio(null)
    setSegments([])
    setDurationMs(0)
    audioKey = null
    audioNeedsWrite = false
    setEditableAudio(null)
    generatedKey = null

    if (message !== null) {
      setEditorState({message, status: 'idle'})
    }
  }
  const loadDialogue = async (id: string, isCurrent: () => boolean) => {
    try {
      const dialogue = await repository.getDialogue(id)

      if (!isCurrent()) {
        return
      }

      if (dialogue === null) {
        setEditorState({message: m.dialogue_status_not_found(), status: 'error'})
        return
      }

      const {audioKey: storedAudioKey, createdAt: storedCreatedAt} = dialogue
      const storedAudio = await repository.getAudio(storedAudioKey)

      if (!isCurrent()) {
        return
      }

      if (storedAudio === null) {
        setEditorState({
          message: m.dialogue_status_audio_missing(),
          status: 'error',
        })
        setText(dialogue.text)
        setLanguageSignal(dialogue.language)
        setModelIdSignal(dialogue.modelId)
        setVoiceIdSignal(dialogue.voiceId)
        return
      }

      setText(dialogue.text)
      setLanguageSignal(dialogue.language)
      setModelIdSignal(dialogue.modelId)
      setVoiceIdSignal(dialogue.voiceId)
      setSegments(dialogue.segments)
      setDurationMs(dialogue.durationMs)
      replaceAudio(storedAudio)
      audioKey = storedAudioKey
      createdAt = storedCreatedAt
      generatedKey = getGenerationKey(
        dialogue.language,
        dialogue.modelId,
        dialogue.voiceId,
        dialogue.text,
      )
      setEditorState({message: m.dialogue_status_loaded(), status: 'idle'})
    } catch (error: unknown) {
      if (!isCurrent()) {
        return
      }

      console.error('Failed to load focus room dialogue.', error)
      setEditorState({message: m.dialogue_status_load_failed(), status: 'error'})
    }
  }

  createEffect(
    on(props.dialogueId, (selectedId) => {
      routeRevision += 1
      const revision = routeRevision
      const isCurrent = () => !isDisposed && revision === routeRevision
      onCleanup(() => {
        routeRevision += 1
        modelSession.invalidate()
        moodAnalyzer?.dispose()
        moodAnalyzer = null
      })
      draftKey = getDialogueDraftKey(selectedId)
      const draft = selectedId === null ? readDialogueDraft(draftKey) : null
      setDialogueId(selectedId)
      createdAt = null
      clearGeneratedAudio()
      setRegeneratingSegmentIndex(null)
      setText('')
      setLanguageSignal(DEFAULT_FOCUS_ROOM_DIALOGUE_LANGUAGE)
      setModelIdSignal(DEFAULT_MODEL_ID)
      setVoiceIdSignal(DEFAULT_VOICE_ID)
      setEditorState({
        message: selectedId === null ? m.dialogue_status_initial() : m.dialogue_status_loading(),
        status: selectedId === null ? 'idle' : 'loading',
      })

      if (selectedId === null) {
        setText(draft ?? '')
        return
      }

      loadDialogue(selectedId, isCurrent)
        .then(() => {
          const latestDraft = isCurrent() ? readDialogueDraft(draftKey) : null
          if (latestDraft !== null && latestDraft !== text()) {
            setText(latestDraft)
            clearGeneratedAudio()
          }
        })
        .catch((error: unknown) => {
          if (isCurrent()) {
            console.error('Unexpected dialogue loading failure.', error)
          }
        })
    }),
  )

  onCleanup(() => {
    isDisposed = true
    abortOpusEncoding()
    modelSession.dispose()
    moodAnalyzer?.dispose()
    moodAnalyzer = null
    repository.dispose()
    replaceBlobObjectUrl(audioUrl(), () => null)
  })

  const requestDialogueAudio = async (request: DialogueAudioRequest) => {
    setEditorState({message: m.dialogue_status_generating_first(), status: 'generating'})
    const generated = await generateDialogueAudio({
      ...request,
      onChunk: (completed, total) => {
        if (modelSession.isCurrent(request.client)) {
          setEditorState({
            message: m.dialogue_status_generated_chunk({completed, total}),
            status: 'generating',
          })
        }
      },
    })

    if (!modelSession.isCurrent(request.client)) {
      return null
    }

    if (!generated.ok) {
      setEditorState({message: generated.message, status: 'error'})
      return null
    }

    return generated.value
  }

  const commitGeneratedDialogueAudio = async (
    audio: GeneratedDialogueAudio,
    selectedModelId: SupertonicModelId,
    getKey: () => string,
    revision: number,
  ): Promise<boolean> => {
    const preview = await createDialogueAudioPreview(audio, selectedModelId)
    if (isDisposed || revision !== routeRevision) {
      return false
    }
    replaceAudio(preview)
    setEditableAudio(audio)
    setSegments(audio.segments)
    setDurationMs(audio.durationMs)
    audioKey = crypto.randomUUID()
    audioNeedsWrite = true
    generatedKey = getKey()
    return true
  }

  // oxlint-disable-next-line eslint/max-statements -- Each async stage must reject results from a previous route.
  const generate = async () => {
    if (!canGenerate()) {
      return
    }

    const revision = routeRevision
    const selectedModelId = modelId()
    const selectedLanguage = language()
    const sourceText = text().trim()
    const selectedVoiceId = voiceId()
    const activeClient = modelSession.getClient()
    const currentClient =
      activeClient === null || modelSession.getPreparedModelId() !== selectedModelId
        ? await modelSession.prepare(selectedModelId)
        : activeClient

    if (currentClient === null) {
      return
    }

    const generatedAudio = await requestDialogueAudio({
      client: currentClient,
      language: selectedLanguage,
      modelId: selectedModelId,
      text: sourceText,
      voiceId: selectedVoiceId,
    })

    if (generatedAudio === null) {
      return
    }

    try {
      if (
        !(await commitGeneratedDialogueAudio(
          generatedAudio,
          selectedModelId,
          () => getGenerationKey(selectedLanguage, selectedModelId, selectedVoiceId, sourceText),
          revision,
        ))
      ) {
        return
      }
    } catch (error: unknown) {
      if (isDisposed || revision !== routeRevision) {
        return
      }
      console.error('Failed to prepare generated focus room dialogue audio.', error)
      clearGeneratedAudio()
      setEditorState({message: m.dialogue_status_prepare_audio_failed(), status: 'error'})
      return
    }

    try {
      moodAnalyzer ??= moodRuntime.createAnalyzer({
        onProgress: (nextProgress) => {
          if (isDisposed || revision !== routeRevision) {
            return
          }
          setEditorState({
            message: m.dialogue_status_mood_preparing({progress: nextProgress}),
            status: 'analyzing',
          })
        },
      })
      const analyzedSegments = await analyzeDialogueSegmentMoods({
        analyzer: moodAnalyzer,
        onError: (error, segment) => {
          console.warn(`Failed to analyze dialogue segment ${segment.index}.`, error)
        },
        onProgress: (current, total) => {
          if (isDisposed || revision !== routeRevision) {
            return
          }
          setEditorState({
            message: m.dialogue_status_mood_analyzing({current, total}),
            status: 'analyzing',
          })
        },
        segments: generatedAudio.segments,
      })

      if (!modelSession.isCurrent(currentClient)) {
        return
      }

      setSegments(analyzedSegments)
      setEditableAudio({...generatedAudio, segments: analyzedSegments})
      setEditorState({message: m.dialogue_status_mood_complete(), status: 'ready'})
    } catch (error: unknown) {
      if (isDisposed || revision !== routeRevision) {
        return
      }
      console.warn('Failed to analyze focus room dialogue mood.', error)
      setEditorState({
        message: m.dialogue_status_mood_partial(),
        status: 'ready',
      })
    }
  }

  const regenerateSegment = async (position: number) => {
    const revision = routeRevision
    const currentAudio = editableAudio()
    const currentClient = modelSession.getClient()

    if (!canRegenerateSegments() || currentAudio === null || currentClient === null) {
      return
    }

    setRegeneratingSegmentIndex(position)
    setEditorState({
      message: m.dialogue_status_regenerating_segment({number: position + 1}),
      status: 'generating',
    })
    const regenerated = await regenerateDialogueSegmentAudio({
      client: currentClient,
      current: currentAudio,
      language: language(),
      modelId: modelId(),
      position,
      voiceId: voiceId(),
    })

    if (!modelSession.isCurrent(currentClient)) {
      return
    }

    setRegeneratingSegmentIndex(null)

    if (!regenerated.ok) {
      setEditorState({message: regenerated.message, status: 'error'})
      return
    }

    try {
      const nextAudio = regenerated.value
      if (
        !(await commitGeneratedDialogueAudio(nextAudio, modelId(), currentGenerationKey, revision))
      ) {
        return
      }
      setEditorState({
        message: m.dialogue_status_regenerated_segment({number: position + 1}),
        status: 'ready',
      })
    } catch (error: unknown) {
      if (isDisposed || revision !== routeRevision) {
        return
      }
      console.error('Failed to prepare regenerated dialogue audio.', error)
      setEditorState({message: m.dialogue_status_regenerate_audio_failed(), status: 'error'})
    }
  }

  const save = async () => {
    if (!canSave() || audioBlob === null || audioKey === null) {
      return null
    }

    const revision = routeRevision
    const savedDraftKey = draftKey
    setEditorState({message: m.dialogue_status_saving(), status: 'saving'})
    const now = new Date().toISOString()
    const id = dialogueId() ?? crypto.randomUUID()
    const dialogueCreatedAt = createdAt ?? now
    const dialogue = {
      audioKey,
      createdAt: dialogueCreatedAt,
      durationMs: durationMs(),
      id,
      language: language(),
      modelId: modelId(),
      segments: segments(),
      text: text().trim(),
      updatedAt: now,
      version: 1,
      voiceId: voiceId(),
    } satisfies PDialogue

    try {
      const currentAudio = editableAudio()
      const storedAudio =
        audioNeedsWrite && currentAudio !== null
          ? await createOpusBlob({
              sampleRate: currentAudio.sampleRate,
              samples: await createDialogueAudioSamples(currentAudio, modelId()),
              signal: opusEncodingSignal,
            })
          : undefined
      await repository.saveDialogue({audio: storedAudio, dialogue})

      if (isDisposed || revision !== routeRevision) {
        return null
      }

      audioNeedsWrite = false
      createdAt = dialogueCreatedAt
      setDialogueId(id)
      deleteDialogueDraft(savedDraftKey)
      setEditorState({message: m.dialogue_status_saved(), status: 'ready'})
      return id
    } catch (error: unknown) {
      if (isDisposed || revision !== routeRevision) {
        return null
      }

      console.error('Failed to save focus room dialogue.', error)
      setEditorState({message: m.dialogue_status_save_failed(), status: 'error'})
      return null
    }
  }

  const setModelId = (nextModelId: SupertonicModelId) => {
    if (nextModelId === modelId()) {
      return
    }

    modelSession.invalidate()
    setModelIdSignal(nextModelId)
    setRegeneratingSegmentIndex(null)
    clearGeneratedAudio(m.dialogue_status_prepare_selected_model())
  }
  const setVoiceId = (nextVoiceId: SupertonicVoiceId) => {
    if (nextVoiceId !== voiceId()) {
      setVoiceIdSignal(nextVoiceId)
      clearGeneratedAudio(m.dialogue_status_select_voice())
    }
  }
  const setLanguage = (nextLanguage: SupertonicLanguage) => {
    if (nextLanguage !== language()) {
      setLanguageSignal(nextLanguage)
      clearGeneratedAudio(m.dialogue_status_select_language())
    }
  }

  return {
    audioUrl,
    canGenerate,
    canRegenerateSegments,
    canSave,
    dialogueId,
    durationMs,
    generate,
    language,
    modelId,
    progress,
    regenerateSegment,
    regeneratingSegmentIndex,
    save,
    segments,
    setLanguage,
    setModelId,
    setText: (nextText) => {
      setText(nextText)
      writeDialogueDraft(draftKey, nextText)
      clearGeneratedAudio(m.dialogue_status_enter_script())
    },
    setVoiceId,
    state,
    text,
    voiceId,
  }
}
