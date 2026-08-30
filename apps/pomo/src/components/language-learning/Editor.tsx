import {useNavigate} from '@solidjs/router'
import {createEffect, createMemo, createSignal, onCleanup, Show} from 'solid-js'

import * as m from '@paraglide/message'
import {useDialogueWriter} from '../../features/dialogue-writer'
import {
  createPDialogueRepository,
  generateCompressedDialogueAudio,
} from '../../features/focus-room-dialogue'
import {
  createLanguageLearningPrompt,
  getUnmemorizedLanguageLearningWordValues,
  isValidLanguageLearningSentence,
  type LanguageLearningLanguage,
  type LanguageLearningWordSource,
  MINIMUM_RANDOM_LANGUAGE_LEARNING_WORDS,
  normalizeLanguageLearningSentence,
  selectLanguageLearningPromptWords,
  useLanguageLearningWords,
} from '../../features/language-learning'
import {formatModelDownloadSize} from '../../features/model-storage'
import {useModelDownload} from '../../features/model-download'
import {
  createSupertonicClient,
  getSupertonicErrorMessage,
  getSupertonicModel,
  isSupertonicModelDownloaded,
  type SupertonicModelId,
  type SupertonicVoiceId,
} from '../../features/supertonic'
import {getTextModel, isTextModelDownloaded} from '../../features/text-generation'
import {PGenerationStatus} from '../PGenerationStatus'
import {PModelDownloadConsent} from '../PModelDownloadConsent'
import {revokeLanguageLearningAudioUrls} from './candidate'
import {
  getLanguageLearningGenerationStatus,
  isLanguageLearningEditorBusy,
  type LanguageLearningEditorPhase,
  type LanguageLearningEditorWorkflow,
  type LanguageLearningPendingDownload,
  queueLanguageLearningEditorTask,
} from './editor-state'
import {LanguageLearningEditorHeader} from './EditorHeader'
import {LanguageLearningGenerateButton} from './GenerateButton'
import {type LanguageLearningCandidate, LanguageLearningReview} from './Review'
import {type LanguageLearningCount, LanguageLearningSettings} from './Settings'
import {saveLanguageLearningCandidates} from './save'
import {LanguageLearningWordSourceControl} from './WordSource'

const TEXT_MODEL_ID = 'gemma-4-e2b'
const TEXT_MODEL = getTextModel(TEXT_MODEL_ID)
const MAXIMUM_RETRIES = 2

const CLASSES = {
  page: 'min-h-dvh box-border bg-[#17130f] p-[max(1.25rem,var(--pomo-safe-area-inset-top))] text-foreground',
  panel: 'grid gap-5 rounded-5 border border-solid border-border bg-surface p-5',
} as const

// oxlint-disable-next-line eslint/max-lines-per-function -- One page owns a single ordered text, voice, review and save workflow.
export default function LanguageLearningEditor() {
  const navigate = useNavigate()
  const modelDownload = useModelDownload()
  const [language, setLanguage] = createSignal<LanguageLearningLanguage>('en')
  const [voiceId, setVoiceId] = createSignal<SupertonicVoiceId>('Yuna')
  const [modelId, setModelId] = createSignal<SupertonicModelId>('full')
  const [count, setCount] = createSignal<LanguageLearningCount>(1)
  const [wordSource, setWordSource] = createSignal<LanguageLearningWordSource>('direct')
  const [tagInput, setTagInput] = createSignal('')
  const [tags, setTags] = createSignal<ReadonlyArray<string>>([])
  const [sentences, setSentences] = createSignal<ReadonlyArray<string>>([])
  const [candidates, setCandidates] = createSignal<ReadonlyArray<LanguageLearningCandidate>>([])
  const [phase, setPhase] = createSignal<LanguageLearningEditorPhase>('idle')
  const [message, setMessage] = createSignal<string>(m.learning_editor_idle())
  const [pendingDownload, setPendingDownload] = createSignal<LanguageLearningPendingDownload>(null)
  const [regeneratingCandidateId, setRegeneratingCandidateId] = createSignal<string | null>(null)
  const learningWords = useLanguageLearningWords()
  const workflow: LanguageLearningEditorWorkflow = {
    handledOutput: false,
    isDisposed: false,
    retryCount: 0,
  }

  const writer = useDialogueWriter({modelId: TEXT_MODEL_ID, outputLanguage: language})
  const isBusy = () =>
    isLanguageLearningEditorBusy(phase(), regeneratingCandidateId()) ||
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
  onCleanup(() => {
    workflow.isDisposed = true
    writer.release()
    revokeLanguageLearningAudioUrls(candidates())
  })
  const queueSentence = (existingSentences: ReadonlyArray<string>) => {
    workflow.handledOutput = false
    writer.setRequest(
      createLanguageLearningPrompt({
        existingSentences,
        language: language(),
        tags: tags(),
        wordRequirement: wordSource() === 'direct' ? 'all' : 'at-least-one',
      }),
    )
    queueLanguageLearningEditorTask(workflow, writer.generateWithPreparation)
  }
  const fail = (nextMessage: string) => {
    setMessage(nextMessage)
    setPhase('error')
  }
  const clearCandidates = () => {
    revokeLanguageLearningAudioUrls(candidates())
    setCandidates([])
  }

  const generateVoices = async () => {
    setPhase('voice')
    const client = createSupertonicClient()
    const generatedCandidates: Array<LanguageLearningCandidate> = []
    let retainedCandidates = false
    const selectedModelId = modelId()
    const selectedVoiceId = voiceId()

    try {
      const initialized = await client.initialize({
        modelId: selectedModelId,
        onProgress: () => undefined,
        onStatus: setMessage,
      })

      if (workflow.isDisposed) {
        return
      }

      if (!initialized.ok) {
        fail(getSupertonicErrorMessage(initialized.error))
        return
      }

      const generatedSentences = sentences()

      for (const [index, sentence] of generatedSentences.entries()) {
        setMessage(
          m.learning_editor_voice_progress({current: index + 1, total: generatedSentences.length}),
        )
        // oxlint-disable-next-line eslint/no-await-in-loop -- One local voice client generates queued sentences sequentially.
        const generated = await generateCompressedDialogueAudio({
          client,
          language: language(),
          modelId: selectedModelId,
          onChunk: () => undefined,
          text: sentence,
          voiceId: selectedVoiceId,
        })

        if (workflow.isDisposed) {
          return
        }

        if (!generated.ok) {
          fail(generated.message)
          return
        }

        generatedCandidates.push({
          audio: generated.value.audio,
          audioKey: crypto.randomUUID(),
          audioUrl: URL.createObjectURL(generated.value.audio),
          durationMs: generated.value.durationMs,
          id: crypto.randomUUID(),
          modelId: selectedModelId,
          segments: generated.value.segments,
          selected: true,
          text: sentence,
          voiceId: selectedVoiceId,
        })
      }

      clearCandidates()
      setCandidates(generatedCandidates)
      retainedCandidates = true
      setMessage(m.learning_editor_review())
      setPhase('review')
    } catch (error: unknown) {
      console.error('Failed to generate language learning audio.', error)
      fail(m.learning_editor_voice_failed())
    } finally {
      if (!retainedCandidates) {
        revokeLanguageLearningAudioUrls(generatedCandidates)
      }
      client.dispose()
    }
  }

  const ensureVoiceModel = async () => {
    const isDownloaded = await isSupertonicModelDownloaded({modelId: modelId()})

    if (workflow.isDisposed) {
      return
    }

    if (isDownloaded) {
      await generateVoices()
    } else {
      setPendingDownload({kind: 'voice-all'})
    }
  }

  const handleCompletedSentence = () => {
    const sentence = normalizeLanguageLearningSentence(writer.output())

    if (!isValidLanguageLearningSentence(sentence, language())) {
      if (workflow.retryCount < MAXIMUM_RETRIES) {
        workflow.retryCount += 1
        queueSentence(sentences())
        return
      }

      fail(m.learning_editor_invalid_sentence())
      return
    }

    workflow.retryCount = 0
    const nextSentences = [...sentences(), sentence]
    setSentences(nextSentences)

    if (nextSentences.length === count()) {
      ensureVoiceModel().catch((error: unknown) => {
        console.error('Failed to check the language learning voice model.', error)
        fail(m.learning_editor_voice_failed())
      })
      return
    }

    setMessage(m.learning_editor_text_progress({current: nextSentences.length + 1, total: count()}))
    queueSentence(nextSentences)
  }

  createEffect(() => {
    const state = writer.state()

    if (phase() !== 'text') {
      return
    }

    if (state.status === 'complete' && !workflow.handledOutput) {
      workflow.handledOutput = true
      queueLanguageLearningEditorTask(workflow, handleCompletedSentence)
    } else if (state.status === 'error') {
      fail(state.message)
    }
  })

  const beginTextGeneration = () => {
    setSentences([])
    clearCandidates()
    setMessage(m.learning_editor_text_progress({current: 1, total: count()}))
    setPhase('text')
    workflow.retryCount = 0
    queueSentence([])
  }

  const handleGenerate = async () => {
    const nextTags = selectLanguageLearningPromptWords({
      directInput: tagInput(),
      directWords: tags(),
      savedWords: savedWords(),
      source: wordSource(),
    })
    setTags(nextTags)
    setTagInput('')

    if (nextTags.length === 0) {
      fail(
        wordSource() === 'direct'
          ? m.learning_editor_no_tags()
          : m.learning_editor_saved_words_insufficient({
              minimum: MINIMUM_RANDOM_LANGUAGE_LEARNING_WORDS,
            }),
      )
      return
    }

    const isDownloaded = await isTextModelDownloaded({modelId: TEXT_MODEL_ID})

    if (workflow.isDisposed) {
      return
    }

    if (isDownloaded) {
      beginTextGeneration()
    } else {
      setPendingDownload({kind: 'text'})
    }
  }

  const handleDownloadCancel = () => {
    const target = pendingDownload()
    setPendingDownload(null)

    if (target?.kind === 'voice-all') {
      setMessage(m.learning_editor_idle())
      setPhase('idle')
    } else if (target?.kind === 'voice-candidate') {
      setRegeneratingCandidateId(null)
    }
  }

  const regenerateCandidateVoice = async (candidateId: string) => {
    const candidate = candidates().find((item) => item.id === candidateId)

    if (candidate === undefined) {
      setRegeneratingCandidateId(null)
      return
    }

    const selectedModelId = modelId()
    const selectedVoiceId = voiceId()
    const client = createSupertonicClient()
    setRegeneratingCandidateId(candidateId)
    setMessage(m.learning_editor_regenerating_voice())

    try {
      const initialized = await client.initialize({
        modelId: selectedModelId,
        onProgress: () => undefined,
        onStatus: setMessage,
      })

      if (workflow.isDisposed) {
        return
      }

      if (!initialized.ok) {
        setMessage(getSupertonicErrorMessage(initialized.error))
        return
      }

      const generated = await generateCompressedDialogueAudio({
        client,
        language: language(),
        modelId: selectedModelId,
        onChunk: () => undefined,
        text: candidate.text,
        voiceId: selectedVoiceId,
      })

      if (!generated.ok) {
        setMessage(generated.message)
        return
      }

      if (workflow.isDisposed) {
        return
      }

      const nextAudioUrl = URL.createObjectURL(generated.value.audio)
      setCandidates((current) =>
        current.map((item) =>
          item.id === candidateId
            ? {
                ...item,
                audio: generated.value.audio,
                audioUrl: nextAudioUrl,
                durationMs: generated.value.durationMs,
                modelId: selectedModelId,
                segments: generated.value.segments,
                voiceId: selectedVoiceId,
              }
            : item,
        ),
      )
      URL.revokeObjectURL(candidate.audioUrl)
      setMessage(m.learning_editor_voice_regenerated())
    } catch (error: unknown) {
      console.error('Failed to regenerate language learning audio.', error)
      setMessage(m.learning_editor_voice_failed())
    } finally {
      client.dispose()
      if (!workflow.isDisposed) {
        setRegeneratingCandidateId(null)
      }
    }
  }

  const handleRegenerateCandidate = async (candidateId: string) => {
    setRegeneratingCandidateId(candidateId)

    try {
      const isDownloaded = await isSupertonicModelDownloaded({modelId: modelId()})

      if (workflow.isDisposed) {
        return
      }

      if (isDownloaded) {
        await regenerateCandidateVoice(candidateId)
      } else {
        setPendingDownload({candidateId, kind: 'voice-candidate'})
      }
    } catch (error: unknown) {
      console.error('Failed to check the language learning voice model.', error)
      setMessage(m.learning_editor_voice_failed())
      setRegeneratingCandidateId(null)
    }
  }

  const handleDownloadConfirm = async () => {
    const target = pendingDownload()
    setPendingDownload(null)

    if (target === null) {
      return
    }

    const result =
      target.kind === 'text'
        ? await modelDownload.startTextModel(TEXT_MODEL_ID)
        : await modelDownload.startVoiceModel(modelId())

    if (workflow.isDisposed) {
      return
    }

    if (result.status !== 'complete') {
      if (result.status === 'error') {
        if (target.kind === 'voice-candidate') {
          setMessage(result.message)
        } else {
          fail(result.message)
        }
      } else if (result.status === 'cancelled' && target.kind === 'voice-all') {
        setMessage(m.learning_editor_idle())
        setPhase('idle')
      }
      if (target.kind === 'voice-candidate') {
        setRegeneratingCandidateId(null)
      }
      return
    }

    switch (target.kind) {
      case 'text':
        beginTextGeneration()
        return
      case 'voice-all':
        await generateVoices()
        return
      case 'voice-candidate':
        await regenerateCandidateVoice(target.candidateId)
    }
  }

  const handleSave = async () => {
    const selected = candidates().filter((candidate) => candidate.selected)

    if (selected.length === 0) {
      return
    }

    setPhase('saving')
    const repository = createPDialogueRepository()

    try {
      await saveLanguageLearningCandidates({
        candidates: selected,
        createdAt: new Date().toISOString(),
        language: language(),
        repository,
        tags: tags(),
      })
      if (!workflow.isDisposed) {
        navigate('/')
      }
    } catch (error: unknown) {
      console.error('Failed to save language learning sentences.', error)
      fail(m.learning_editor_save_failed())
    } finally {
      repository.dispose()
    }
  }

  const toggleCandidate = (id: string) => {
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === id ? {...candidate, selected: !candidate.selected} : candidate,
      ),
    )
  }

  const handleWordSourceChange = (nextSource: LanguageLearningWordSource) => {
    setWordSource(nextSource)
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
    setLanguage(nextLanguage)

    if (wordSource() === 'saved') {
      setTags([])

      if (nextSavedWordCount < MINIMUM_RANDOM_LANGUAGE_LEARNING_WORDS) {
        setWordSource('direct')
        setMessage(m.learning_editor_idle())
        setPhase('idle')
      }
    }
  }

  return (
    <main class={CLASSES.page}>
      <div class="mx-auto grid w-full max-w-4xl gap-5">
        <LanguageLearningEditorHeader />

        <section class={CLASSES.panel}>
          <LanguageLearningWordSourceControl
            disabled={isBusy() || phase() === 'review'}
            inputValue={tagInput()}
            onInputChange={setTagInput}
            onSourceChange={handleWordSourceChange}
            onWordsChange={setTags}
            savedWordCount={savedWords().length}
            source={wordSource()}
            words={tags()}
          />

          <LanguageLearningSettings
            count={count()}
            disabled={isBusy()}
            language={language()}
            modelId={modelId()}
            onCountChange={setCount}
            onLanguageChange={handleLanguageChange}
            onModelChange={setModelId}
            onVoiceChange={setVoiceId}
            sentenceDisabled={phase() === 'review'}
            voiceId={voiceId()}
          />

          <PGenerationStatus
            kind={generationStatus().kind}
            message={generationStatus().message}
            progress={generationStatus().progress}
            progressLabel={generationStatus().progressLabel}
          />
          <LanguageLearningGenerateButton disabled={isBusy()} onPress={handleGenerate} />
        </section>

        <Show when={phase() === 'review'}>
          <LanguageLearningReview
            busy={isBusy()}
            candidates={candidates()}
            onRegenerate={handleRegenerateCandidate}
            onSave={handleSave}
            onToggle={toggleCandidate}
            regeneratingCandidateId={regeneratingCandidateId()}
          />
        </Show>
      </div>

      <PModelDownloadConsent
        actionLabel={
          pendingDownload()?.kind === 'voice-candidate'
            ? m.learning_editor_regenerate_voice()
            : m.learning_editor_generate()
        }
        downloadSize={
          pendingDownload()?.kind === 'voice-all' || pendingDownload()?.kind === 'voice-candidate'
            ? formatModelDownloadSize(getSupertonicModel(modelId()).size)
            : TEXT_MODEL.downloadSize
        }
        isOpen={pendingDownload() !== null}
        onCancel={handleDownloadCancel}
        onConfirm={handleDownloadConfirm}
      />
    </main>
  )
}
