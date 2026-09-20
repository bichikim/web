import {createEffect, createMemo, createSignal, onCleanup, onMount} from 'solid-js'

import * as m from '@paraglide/message'
import {usePreference} from 'src/hooks/use-preference'
import {useDialogueWriter} from '../../features/dialogue-writer'
import {
  getUnmemorizedLanguageLearningWordValues,
  LANGUAGE_LEARNING_WORD_SOURCE_STORAGE_KEY,
  type LanguageLearningLanguage,
  type LanguageLearningWordSource,
  languageLearningWordSourcePreferenceStorage,
  MINIMUM_RANDOM_LANGUAGE_LEARNING_WORDS,
  parseLanguageLearningWordSource,
  useLanguageLearningWords,
} from '../../features/language-learning'
import {useModelDownload} from '../../features/model-download'
import type {SupertonicModelId, SupertonicVoiceId} from '../../features/supertonic'
import {type LanguageLearningCandidate, revokeLanguageLearningAudioUrls} from './candidate'
import {
  getLanguageLearningGenerationStatus,
  isLanguageLearningEditorBusy,
  type LanguageLearningEditorPhase,
  type LanguageLearningEditorWorkflow,
  type LanguageLearningPendingDownload,
} from './editor-state'
import type {LanguageLearningCount} from './Settings'

const TEXT_MODEL_ID = 'gemma-4-e2b'

export const useLanguageLearningEditorState = () => {
  const modelDownload = useModelDownload()
  const [language, setLanguage] = createSignal<LanguageLearningLanguage>('en')
  const [voiceId, setVoiceId] = createSignal<SupertonicVoiceId>('Yuna')
  const [modelId, setModelId] = createSignal<SupertonicModelId>('full')
  const [count, setCount] = createSignal<LanguageLearningCount>(1)
  const [storedWordSource, setStoredWordSource] = usePreference<LanguageLearningWordSource>({
    defaultValue: 'direct',
    key: LANGUAGE_LEARNING_WORD_SOURCE_STORAGE_KEY,
    parse: parseLanguageLearningWordSource,
    storage: languageLearningWordSourcePreferenceStorage,
  })
  const wordSource = () => storedWordSource() ?? 'direct'
  const [tagInput, setTagInput] = createSignal('')
  const [tags, setTags] = createSignal<ReadonlyArray<string>>([])
  const [sentences, setSentences] = createSignal<ReadonlyArray<string>>([])
  const [candidates, setCandidates] = createSignal<ReadonlyArray<LanguageLearningCandidate>>([])
  const [phase, setPhase] = createSignal<LanguageLearningEditorPhase>('idle')
  const [message, setMessage] = createSignal<string>(m.learning_editor_idle())
  const [pendingDownload, setPendingDownload] = createSignal<LanguageLearningPendingDownload>(null)
  const [downloadContinuationActive, setDownloadContinuationActive] = createSignal(false)
  const [textModelCheckActive, setTextModelCheckActive] = createSignal(false)
  const [regeneratingCandidateId, setRegeneratingCandidateId] = createSignal<string | null>(null)
  const [editorMounted, setEditorMounted] = createSignal(false)
  const learningWords = useLanguageLearningWords()
  const workflow: LanguageLearningEditorWorkflow = {
    handledOutput: false,
    isDisposed: false,
    retryCount: 0,
  }
  const writer = useDialogueWriter({modelId: TEXT_MODEL_ID, outputLanguage: language})
  const isBusy = () =>
    isLanguageLearningEditorBusy(phase(), regeneratingCandidateId()) ||
    downloadContinuationActive() ||
    textModelCheckActive() ||
    modelDownload.state().status === 'loading'
  const generationStatus = createMemo(() =>
    getLanguageLearningGenerationStatus({
      downloadState: modelDownload.state(),
      message: message(),
      phase: phase(),
    }),
  )
  const savedWords = createMemo(() =>
    getUnmemorizedLanguageLearningWordValues({language: language(), words: learningWords()}),
  )
  onMount(() => setEditorMounted(true))
  createEffect(() => {
    if (
      editorMounted() &&
      wordSource() === 'saved' &&
      savedWords().length < MINIMUM_RANDOM_LANGUAGE_LEARNING_WORDS
    ) {
      setStoredWordSource('direct')
    }
  })
  const fail = (nextMessage: string) => {
    setMessage(nextMessage)
    setPhase('error')
  }
  const clearCandidates = () => {
    revokeLanguageLearningAudioUrls(candidates())
    setCandidates([])
  }
  const handleWordSourceChange = (nextSource: LanguageLearningWordSource) => {
    clearCandidates()
    setSentences([])
    setStoredWordSource(nextSource)
    setTags([])
    setTagInput('')
    setMessage(m.learning_editor_idle())
    setPhase('idle')
  }
  const handleLanguageChange = (nextLanguage: LanguageLearningLanguage) => {
    const nextSavedWordCount = getUnmemorizedLanguageLearningWordValues({
      language: nextLanguage,
      words: learningWords(),
    }).length
    clearCandidates()
    setSentences([])
    setMessage(m.learning_editor_idle())
    setPhase('idle')
    setLanguage(nextLanguage)

    if (wordSource() === 'saved') {
      setTags([])

      if (nextSavedWordCount < MINIMUM_RANDOM_LANGUAGE_LEARNING_WORDS) {
        setStoredWordSource('direct')
      }
    }
  }

  onCleanup(() => {
    workflow.isDisposed = true
    writer.release()
    revokeLanguageLearningAudioUrls(candidates())
  })

  return {
    candidates,
    clearCandidates,
    count,
    fail,
    generationStatus,
    handleLanguageChange,
    handleWordSourceChange,
    isBusy,
    language,
    message,
    modelDownload,
    modelId,
    pendingDownload,
    phase,
    regeneratingCandidateId,
    savedWords,
    sentences,
    setCandidates,
    setCount,
    setDownloadContinuationActive,
    setMessage,
    setModelId,
    setPendingDownload,
    setPhase,
    setRegeneratingCandidateId,
    setSentences,
    setTagInput,
    setTags,
    setTextModelCheckActive,
    setVoiceId,
    tagInput,
    tags,
    textModelCheckActive,
    voiceId,
    wordSource,
    workflow,
    writer,
  }
}

export type LanguageLearningEditorState = ReturnType<typeof useLanguageLearningEditorState>

export {TEXT_MODEL_ID}
