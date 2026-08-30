import {createEffect} from 'solid-js'

import * as m from '@paraglide/message'
import {
  createLanguageLearningPrompt,
  MINIMUM_RANDOM_LANGUAGE_LEARNING_WORDS,
  selectLanguageLearningPromptWords,
} from '../../features/language-learning'
import {isTextModelDownloaded} from '../../features/text-generation'
import {queueLanguageLearningEditorTask} from './editor-state'
import {resolveSentenceGeneration} from './sentence-generation'
import {type LanguageLearningEditorState, TEXT_MODEL_ID} from './use-editor-state'

export interface UseSentenceGenerationProps {
  readonly ensureVoiceModel: () => Promise<void>
  readonly state: LanguageLearningEditorState
}

export const useSentenceGeneration = (props: UseSentenceGenerationProps) => {
  const queueSentence = (existingSentences: ReadonlyArray<string>) => {
    props.state.workflow.handledOutput = false
    props.state.writer.setRequest(
      createLanguageLearningPrompt({
        existingSentences,
        language: props.state.language(),
        tags: props.state.tags(),
        wordRequirement: props.state.wordSource() === 'direct' ? 'all' : 'at-least-one',
      }),
    )
    queueLanguageLearningEditorTask(
      props.state.workflow,
      props.state.writer.generateWithPreparation,
    )
  }
  const handleCompletedSentence = () => {
    const resolution = resolveSentenceGeneration({
      count: props.state.count(),
      language: props.state.language(),
      output: props.state.writer.output(),
      retryCount: props.state.workflow.retryCount,
      sentences: props.state.sentences(),
    })

    switch (resolution.kind) {
      case 'retry':
        props.state.workflow.retryCount = resolution.retryCount
        queueSentence(props.state.sentences())
        return
      case 'invalid':
        props.state.fail(m.learning_editor_invalid_sentence())
        return
      case 'continue':
        props.state.workflow.retryCount = 0
        props.state.setSentences(resolution.sentences)
        props.state.setMessage(
          m.learning_editor_text_progress({
            current: resolution.sentences.length + 1,
            total: props.state.count(),
          }),
        )
        queueSentence(resolution.sentences)
        return
      case 'complete':
        props.state.workflow.retryCount = 0
        props.state.setSentences(resolution.sentences)
        props.ensureVoiceModel().catch((error: unknown) => {
          console.error('Failed to check the language learning voice model.', error)
          props.state.fail(m.learning_editor_voice_failed())
        })
    }
  }
  const beginTextGeneration = () => {
    props.state.setSentences([])
    props.state.clearCandidates()
    props.state.setMessage(
      m.learning_editor_text_progress({current: 1, total: props.state.count()}),
    )
    props.state.setPhase('text')
    props.state.workflow.retryCount = 0
    queueSentence([])
  }
  const handleGenerate = async () => {
    const nextTags = selectLanguageLearningPromptWords({
      directInput: props.state.tagInput(),
      directWords: props.state.tags(),
      savedWords: props.state.savedWords(),
      source: props.state.wordSource(),
    })
    props.state.setTags(nextTags)
    props.state.setTagInput('')

    if (nextTags.length === 0) {
      props.state.fail(
        props.state.wordSource() === 'direct'
          ? m.learning_editor_no_tags()
          : m.learning_editor_saved_words_insufficient({
              minimum: MINIMUM_RANDOM_LANGUAGE_LEARNING_WORDS,
            }),
      )
      return
    }

    const isDownloaded = await isTextModelDownloaded({modelId: TEXT_MODEL_ID})

    if (props.state.workflow.isDisposed) {
      return
    }

    if (isDownloaded) {
      beginTextGeneration()
    } else {
      props.state.setPendingDownload({kind: 'text'})
    }
  }

  createEffect(() => {
    const writerState = props.state.writer.state()

    if (props.state.phase() !== 'text') {
      return
    }

    if (writerState.status === 'complete' && !props.state.workflow.handledOutput) {
      props.state.workflow.handledOutput = true
      queueLanguageLearningEditorTask(props.state.workflow, handleCompletedSentence)
    } else if (writerState.status === 'error') {
      props.state.fail(writerState.message)
    }
  })

  return {beginTextGeneration, handleGenerate}
}
