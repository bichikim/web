import {createMemo, createSignal, onCleanup, onMount, untrack} from 'solid-js'

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

const revokeUrl = (url: string | null) => {
  if (url !== null) {
    URL.revokeObjectURL(url)
  }
}

/** Owns the browser-only lifecycle for editing, generating and persisting a dialogue. */
// oxlint-disable-next-line eslint/max-lines-per-function -- The editor hook owns one disposable model, audio URL and persistence lifecycle.
export const usePDialogueEditor = (props: UsePDialogueEditorProps): PDialogueEditorController => {
  const initialDialogueId = untrack(props.dialogueId)
  const moodRuntime = untrack(() => props.moodRuntime ?? {createAnalyzer: createTextMoodAnalyzer})
  const draftKey = getDialogueDraftKey(initialDialogueId)
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
    message:
      initialDialogueId === null
        ? '대사를 입력한 뒤 음성 만들기를 눌러 주세요.'
        : '대화를 불러오고 있어요.',
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
  const canGenerate = createMemo(() => !isBusy() && text().trim().length > 0)
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

    revokeUrl(audioUrl())
    audioBlob = blob
    setAudioUrl(blob === null ? null : URL.createObjectURL(blob))
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
  const loadDialogue = async (id: string) => {
    try {
      const dialogue = await repository.getDialogue(id)

      if (isDisposed) {
        return
      }

      if (dialogue === null) {
        setEditorState({message: '저장된 대화를 찾을 수 없어요.', status: 'error'})
        return
      }

      const {audioKey: storedAudioKey, createdAt: storedCreatedAt} = dialogue
      const storedAudio = await repository.getAudio(storedAudioKey)

      if (isDisposed) {
        return
      }

      if (storedAudio === null) {
        setEditorState({
          message: '저장된 음성 파일을 찾을 수 없어요. 음성을 다시 만들어 주세요.',
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
      setEditorState({message: '저장된 대화를 불러왔어요.', status: 'idle'})
    } catch (error: unknown) {
      if (isDisposed) {
        return
      }

      console.error('Failed to load focus room dialogue.', error)
      setEditorState({message: '대화를 불러오지 못했어요.', status: 'error'})
    }
  }

  onMount(() => {
    const draft = readDialogueDraft(draftKey)

    if (initialDialogueId === null) {
      if (draft !== null) {
        setText(draft)
      }

      return
    }

    loadDialogue(initialDialogueId)
      .then(() => {
        if (isDisposed) {
          return
        }

        if (draft !== null && draft !== text()) {
          setText(draft)
          clearGeneratedAudio()
        }
      })
      .catch((error: unknown) => {
        console.error('Unexpected dialogue loading failure.', error)
      })
  })

  onCleanup(() => {
    isDisposed = true
    abortOpusEncoding()
    modelSession.dispose()
    moodAnalyzer?.dispose()
    moodAnalyzer = null
    repository.dispose()
    revokeUrl(audioUrl())
  })

  const requestDialogueAudio = async (request: DialogueAudioRequest) => {
    setEditorState({message: '첫 번째 음성 구간을 만들고 있어요.', status: 'generating'})
    const generated = await generateDialogueAudio({
      ...request,
      onChunk: (completed, total) => {
        if (modelSession.isCurrent(request.client)) {
          setEditorState({
            message: `${completed}/${total} 음성 구간을 만들었어요.`,
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

  const generate = async () => {
    if (!canGenerate()) {
      return
    }

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
      replaceAudio(await createDialogueAudioPreview(generatedAudio, selectedModelId))
      setEditableAudio(generatedAudio)
      setSegments(generatedAudio.segments)
      setDurationMs(generatedAudio.durationMs)
      audioKey = crypto.randomUUID()
      audioNeedsWrite = true
      generatedKey = getGenerationKey(
        selectedLanguage,
        selectedModelId,
        selectedVoiceId,
        sourceText,
      )
    } catch (error: unknown) {
      console.error('Failed to prepare generated focus room dialogue audio.', error)
      clearGeneratedAudio()
      setEditorState({message: '생성된 음성을 준비하지 못했어요.', status: 'error'})
      return
    }

    try {
      moodAnalyzer ??= moodRuntime.createAnalyzer({
        onProgress: (nextProgress) => {
          setEditorState({
            message: `감정 분석 모델 준비 중 · ${nextProgress}%`,
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
          setEditorState({
            message: `${current}/${total} 문장의 감정을 분석하고 있어요.`,
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
      setEditorState({message: '음성과 문장별 감정 분석을 마쳤어요.', status: 'ready'})
    } catch (error: unknown) {
      console.warn('Failed to analyze focus room dialogue mood.', error)
      setEditorState({
        message: '음성은 만들었지만 일부 감정은 분석하지 못했어요.',
        status: 'ready',
      })
    }
  }

  const regenerateSegment = async (position: number) => {
    const currentAudio = editableAudio()
    const currentClient = modelSession.getClient()

    if (!canRegenerateSegments() || currentAudio === null || currentClient === null) {
      return
    }

    setRegeneratingSegmentIndex(position)
    setEditorState({
      message: `${position + 1}번 말풍선 음성을 다시 만들고 있어요.`,
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
      replaceAudio(await createDialogueAudioPreview(nextAudio, modelId()))
      setEditableAudio(nextAudio)
      setSegments(nextAudio.segments)
      setDurationMs(nextAudio.durationMs)
      audioKey = crypto.randomUUID()
      audioNeedsWrite = true
      generatedKey = currentGenerationKey()
      setEditorState({message: `${position + 1}번 말풍선 음성을 다시 만들었어요.`, status: 'ready'})
    } catch (error: unknown) {
      console.error('Failed to prepare regenerated dialogue audio.', error)
      setEditorState({message: '다시 만든 음성을 준비하지 못했어요.', status: 'error'})
    }
  }

  const save = async () => {
    if (!canSave() || audioBlob === null || audioKey === null) {
      return null
    }

    setEditorState({message: '대화를 기기에 저장하고 있어요.', status: 'saving'})
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

      if (isDisposed) {
        return null
      }

      audioNeedsWrite = false
      createdAt = dialogueCreatedAt
      setDialogueId(id)
      deleteDialogueDraft(draftKey)
      setEditorState({message: '대화를 저장했어요.', status: 'ready'})
      return id
    } catch (error: unknown) {
      if (isDisposed) {
        return null
      }

      console.error('Failed to save focus room dialogue.', error)
      setEditorState({message: '대화를 저장하지 못했어요.', status: 'error'})
      return null
    }
  }

  const setModelId = (nextModelId: SupertonicModelId) => {
    if (nextModelId === modelId()) {
      return
    }

    modelSession.invalidate()
    setModelIdSignal(nextModelId)
    clearGeneratedAudio('음성 만들기를 누르면 선택한 모델을 자동으로 준비해요.')
  }
  const setVoiceId = (nextVoiceId: SupertonicVoiceId) => {
    if (nextVoiceId !== voiceId()) {
      setVoiceIdSignal(nextVoiceId)
      clearGeneratedAudio('선택한 목소리로 음성을 만들어 주세요.')
    }
  }
  const setLanguage = (nextLanguage: SupertonicLanguage) => {
    if (nextLanguage !== language()) {
      setLanguageSignal(nextLanguage)
      clearGeneratedAudio('선택한 언어로 음성을 만들어 주세요.')
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
      clearGeneratedAudio('입력한 대사로 음성을 만들어 주세요.')
    },
    setVoiceId,
    state,
    text,
    voiceId,
  }
}
