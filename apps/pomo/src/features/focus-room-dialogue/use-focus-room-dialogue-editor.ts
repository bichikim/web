import {type Accessor, createMemo, createSignal, onCleanup, onMount, untrack} from 'solid-js'

import {
  createSupertonicClient,
  createWaveBlob,
  getSupertonicErrorMessage,
  getSupertonicModel,
  type SupertonicAudioChunk,
  type SupertonicClient,
  type SupertonicModelId,
  type SupertonicVoiceId,
} from '../supertonic'
import {splitSpeechText} from '../supertonic/text-chunking'
import {createFocusRoomDialogueRepository} from './repository'
import {type DialogueSegment, type FocusRoomDialogue} from './schema'
import {createDialogueTimeline} from './timeline'

const MAXIMUM_PROGRESS = 100
const DEFAULT_MODEL_ID: SupertonicModelId = 'full'
const DEFAULT_VOICE_ID: SupertonicVoiceId = 'Yuna'
const DIALOGUE_DRAFT_KEY_PREFIX = 'pomo:focus-room-dialogue:draft:'

interface EditorIdleState {
  readonly message: string
  readonly status: 'idle' | 'ready'
}

interface EditorProgressState {
  readonly message: string
  readonly progress: number
  readonly status: 'preparing'
}

interface EditorBusyState {
  readonly message: string
  readonly status: 'generating' | 'loading' | 'saving'
}

interface EditorErrorState {
  readonly message: string
  readonly status: 'error'
}

export type DialogueEditorState =
  | EditorBusyState
  | EditorErrorState
  | EditorIdleState
  | EditorProgressState

export interface UseFocusRoomDialogueEditorProps {
  readonly dialogueId: Accessor<string | null>
}

export interface FocusRoomDialogueEditorController {
  readonly audioUrl: Accessor<string | null>
  readonly canGenerate: Accessor<boolean>
  readonly canSave: Accessor<boolean>
  readonly dialogueId: Accessor<string | null>
  readonly durationMs: Accessor<number>
  readonly generate: () => Promise<void>
  readonly modelId: Accessor<SupertonicModelId>
  readonly progress: Accessor<number>
  readonly save: () => Promise<string | null>
  readonly segments: Accessor<ReadonlyArray<DialogueSegment>>
  readonly setModelId: (modelId: SupertonicModelId) => void
  readonly setText: (text: string) => void
  readonly setVoiceId: (voiceId: SupertonicVoiceId) => void
  readonly state: Accessor<DialogueEditorState>
  readonly text: Accessor<string>
  readonly voiceId: Accessor<SupertonicVoiceId>
}

const getGenerationKey = (modelId: SupertonicModelId, voiceId: SupertonicVoiceId, text: string) =>
  `${modelId}\u0000${voiceId}\u0000${text.trim()}`

const getDialogueDraftKey = (dialogueId: string | null) =>
  `${DIALOGUE_DRAFT_KEY_PREFIX}${dialogueId ?? 'new'}`

const readDialogueDraft = (key: string) => {
  try {
    return sessionStorage.getItem(key)
  } catch (error: unknown) {
    console.warn('Failed to read focus room dialogue draft.', error)
    return null
  }
}

const writeDialogueDraft = (key: string, text: string) => {
  try {
    sessionStorage.setItem(key, text)
  } catch (error: unknown) {
    console.warn('Failed to save focus room dialogue draft.', error)
  }
}

const deleteDialogueDraft = (key: string) => {
  try {
    sessionStorage.removeItem(key)
  } catch (error: unknown) {
    console.warn('Failed to delete focus room dialogue draft.', error)
  }
}

const revokeUrl = (url: string | null) => {
  if (url !== null) {
    URL.revokeObjectURL(url)
  }
}

const getProgress = (loadedBytes: number, totalBytes: number) =>
  Math.min(MAXIMUM_PROGRESS, Math.round((loadedBytes / totalBytes) * MAXIMUM_PROGRESS))

/** Owns the browser-only lifecycle for editing, generating and persisting a dialogue. */
// oxlint-disable-next-line eslint/max-lines-per-function -- The editor hook owns one disposable model, audio URL and persistence lifecycle.
export const useFocusRoomDialogueEditor = (
  props: UseFocusRoomDialogueEditorProps,
): FocusRoomDialogueEditorController => {
  const initialDialogueId = untrack(props.dialogueId)
  const draftKey = getDialogueDraftKey(initialDialogueId)
  const repository = createFocusRoomDialogueRepository()
  const [dialogueId, setDialogueId] = createSignal<string | null>(initialDialogueId)
  const [text, setText] = createSignal('')
  const [modelId, setModelIdSignal] = createSignal<SupertonicModelId>(DEFAULT_MODEL_ID)
  const [voiceId, setVoiceIdSignal] = createSignal<SupertonicVoiceId>(DEFAULT_VOICE_ID)
  const [segments, setSegments] = createSignal<ReadonlyArray<DialogueSegment>>([])
  const [durationMs, setDurationMs] = createSignal(0)
  const [audioUrl, setAudioUrl] = createSignal<string | null>(null)
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
  let client: SupertonicClient | null = null
  let createdAt: string | null = null
  let generatedKey: string | null = null
  let preparedModelId: SupertonicModelId | null = null

  const isBusy = createMemo(() => {
    const {status} = state()
    return (
      status === 'generating' ||
      status === 'loading' ||
      status === 'preparing' ||
      status === 'saving'
    )
  })
  const currentGenerationKey = () => getGenerationKey(modelId(), voiceId(), text())
  const hasCurrentAudio = () => audioBlob !== null && generatedKey === currentGenerationKey()
  const canGenerate = createMemo(() => !isBusy() && text().trim().length > 0)
  const canSave = createMemo(() => !isBusy() && hasCurrentAudio() && segments().length > 0)
  const progress = createMemo(() => {
    const currentState = state()
    return currentState.status === 'preparing'
      ? currentState.progress
      : preparedModelId === modelId()
        ? MAXIMUM_PROGRESS
        : 0
  })

  const replaceAudio = (blob: Blob | null) => {
    revokeUrl(audioUrl())
    audioBlob = blob
    setAudioUrl(blob === null ? null : URL.createObjectURL(blob))
  }

  const clearGeneratedAudio = () => {
    replaceAudio(null)
    setSegments([])
    setDurationMs(0)
    audioKey = null
    audioNeedsWrite = false
    generatedKey = null
  }

  const loadDialogue = async (id: string) => {
    try {
      const dialogue = await repository.getDialogue(id)

      if (dialogue === null) {
        setState({message: '저장된 대화를 찾을 수 없어요.', status: 'error'})
        return
      }

      const {audioKey: storedAudioKey, createdAt: storedCreatedAt} = dialogue
      const storedAudio = await repository.getAudio(storedAudioKey)

      if (storedAudio === null) {
        setState({
          message: '저장된 음성 파일을 찾을 수 없어요. 음성을 다시 만들어 주세요.',
          status: 'error',
        })
        setText(dialogue.text)
        setModelIdSignal(dialogue.modelId)
        setVoiceIdSignal(dialogue.voiceId)
        return
      }

      setText(dialogue.text)
      setModelIdSignal(dialogue.modelId)
      setVoiceIdSignal(dialogue.voiceId)
      setSegments(dialogue.segments)
      setDurationMs(dialogue.durationMs)
      replaceAudio(storedAudio)
      audioKey = storedAudioKey
      createdAt = storedCreatedAt
      generatedKey = getGenerationKey(dialogue.modelId, dialogue.voiceId, dialogue.text)
      setState({message: '저장된 대화를 불러왔어요.', status: 'idle'})
    } catch (error: unknown) {
      console.error('Failed to load focus room dialogue.', error)
      setState({message: '대화를 불러오지 못했어요.', status: 'error'})
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
    client?.dispose()
    revokeUrl(audioUrl())
  })

  const prepareModel = async (selectedModelId: SupertonicModelId) => {
    client?.dispose()
    const nextClient = createSupertonicClient()
    client = nextClient
    setState({message: '음성 모델을 확인하고 있어요.', progress: 0, status: 'preparing'})

    const result = await nextClient.initialize({
      modelId: selectedModelId,
      onProgress: (nextProgress) => {
        if (client === nextClient) {
          setState({
            message: `${nextProgress.fileName} 준비 중…`,
            progress: getProgress(nextProgress.loadedBytes, nextProgress.totalBytes),
            status: 'preparing',
          })
        }
      },
      onStatus: (message) => {
        if (client === nextClient) {
          const currentState = state()
          setState(
            currentState.status === 'preparing'
              ? {...currentState, message}
              : {message, status: 'idle'},
          )
        }
      },
    })

    if (client !== nextClient) {
      return false
    }

    if (!result.ok) {
      setState({message: getSupertonicErrorMessage(result.error), status: 'error'})
      return false
    }

    preparedModelId = selectedModelId
    return true
  }

  const generate = async () => {
    if (!canGenerate()) {
      return
    }

    const selectedModelId = modelId()
    const sourceText = text().trim()

    if (sourceText.length === 0) {
      return
    }

    if (client === null || preparedModelId !== selectedModelId) {
      const isPrepared = await prepareModel(selectedModelId)

      if (!isPrepared) {
        return
      }
    }

    const currentClient = client

    if (currentClient === null || preparedModelId !== selectedModelId) {
      return
    }

    const selectedModel = getSupertonicModel(selectedModelId)
    const textChunks = splitSpeechText(sourceText, selectedModel.speechPolicy)
    const audioChunks: Array<SupertonicAudioChunk> = []
    setState({message: '첫 번째 음성 구간을 만들고 있어요.', status: 'generating'})

    for await (const result of currentClient.generateStream({
      text: sourceText,
      voice: {id: voiceId(), kind: 'preset'},
    })) {
      if (!result.ok) {
        setState({message: getSupertonicErrorMessage(result.error), status: 'error'})
        return
      }

      if (result.value.type === 'chunk') {
        audioChunks.push(result.value.audio)
        setState({
          message: `${result.value.audio.index + 1}/${result.value.audio.total} 음성 구간을 만들었어요.`,
          status: 'generating',
        })
      } else {
        const timeline = createDialogueTimeline({
          audioChunks,
          silenceDuration: selectedModel.speechPolicy.silenceDuration,
          textChunks,
        })
        replaceAudio(createWaveBlob(result.value.audio.samples, result.value.audio.sampleRate))
        setSegments(timeline.segments)
        setDurationMs(timeline.durationMs)
        audioKey = crypto.randomUUID()
        audioNeedsWrite = true
        generatedKey = currentGenerationKey()
      }
    }

    setState({message: '음성과 말풍선 타임라인을 만들었어요.', status: 'ready'})
  }

  const save = async () => {
    if (!canSave() || audioBlob === null || audioKey === null) {
      return null
    }

    setState({message: '대화를 기기에 저장하고 있어요.', status: 'saving'})
    const now = new Date().toISOString()
    const id = dialogueId() ?? crypto.randomUUID()
    const dialogueCreatedAt = createdAt ?? now
    const dialogue = {
      audioKey,
      createdAt: dialogueCreatedAt,
      durationMs: durationMs(),
      id,
      modelId: modelId(),
      segments: segments(),
      text: text().trim(),
      updatedAt: now,
      version: 1,
      voiceId: voiceId(),
    } satisfies FocusRoomDialogue

    try {
      await repository.saveDialogue({audio: audioNeedsWrite ? audioBlob : undefined, dialogue})
      audioNeedsWrite = false
      createdAt = dialogueCreatedAt
      setDialogueId(id)
      deleteDialogueDraft(draftKey)
      setState({message: '대화를 저장했어요.', status: 'ready'})
      return id
    } catch (error: unknown) {
      console.error('Failed to save focus room dialogue.', error)
      setState({message: '대화를 저장하지 못했어요.', status: 'error'})
      return null
    }
  }

  const setModelId = (nextModelId: SupertonicModelId) => {
    if (nextModelId === modelId()) {
      return
    }

    client?.dispose()
    client = null
    preparedModelId = null
    setModelIdSignal(nextModelId)
    clearGeneratedAudio()
    setState({message: '음성 만들기를 누르면 선택한 모델을 자동으로 준비해요.', status: 'idle'})
  }
  const setVoiceId = (nextVoiceId: SupertonicVoiceId) => {
    if (nextVoiceId !== voiceId()) {
      setVoiceIdSignal(nextVoiceId)
      clearGeneratedAudio()
    }
  }

  return {
    audioUrl,
    canGenerate,
    canSave,
    dialogueId,
    durationMs,
    generate,
    modelId,
    progress,
    save,
    segments,
    setModelId,
    setText: (nextText) => {
      setText(nextText)
      writeDialogueDraft(draftKey, nextText)
      clearGeneratedAudio()
    },
    setVoiceId,
    state,
    text,
    voiceId,
  }
}
