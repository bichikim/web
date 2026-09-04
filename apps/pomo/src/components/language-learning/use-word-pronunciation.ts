import {createSignal, onCleanup} from 'solid-js'

import * as m from '@paraglide/message'
import {
  type AutomaticDialogueSettings,
  createAutomaticDialogueSettingsRepository,
} from '../../features/focus-room-dialogue/automatic-dialogue-settings'
import {
  createLanguageLearningWordAudioRepository,
  type LanguageLearningWord,
  type LanguageLearningWordAudioRepository,
  LanguageLearningWordAudioStorageError,
} from '../../features/language-learning'
import {type ModelAssetManager, useModelAssetManager} from '../../features/model-download'
import {isSupertonicModelDownloaded} from '../../features/supertonic'
import {generateLanguageLearningWordPronunciation} from './word-pronunciation'

const getWordKey = (word: LanguageLearningWord) => `${word.language}:${word.value}`

interface PendingPronunciation {
  readonly audioOwner: string
  readonly modelId: AutomaticDialogueSettings['modelId']
  readonly revision: number
  readonly voiceId: AutomaticDialogueSettings['voiceId']
  readonly word: LanguageLearningWord
}

type AudioUrlMap = Readonly<Record<string, string>>

const getFailureMessage = (reason: unknown) => {
  if (reason instanceof LanguageLearningWordAudioStorageError) {
    switch (reason.operation) {
      case 'delete':
        return m.learning_words_audio_delete_failed()
      case 'open':
      case 'read':
        return m.learning_words_audio_load_failed()
      case 'write':
        return m.learning_words_audio_save_failed()
    }
  }

  return reason instanceof Error ? reason.message : m.learning_words_pronunciation_failed()
}

interface AudioPublisherOptions {
  readonly getAudioUrls: () => AudioUrlMap
  readonly getAutoplayKey: () => string | null
  readonly isDisposed: () => boolean
  readonly setAudioUrls: (value: AudioUrlMap) => void
  readonly setAutoplayKey: (value: string | null) => void
}

const createAudioPublisher = (options: AudioPublisherOptions) => {
  const requestAutoplay = (key: string) => {
    options.setAutoplayKey(null)
    queueMicrotask(() => {
      if (options.isDisposed()) {
        return
      }

      options.setAutoplayKey(key)
      queueMicrotask(() => {
        if (!options.isDisposed() && options.getAutoplayKey() === key) {
          options.setAutoplayKey(null)
        }
      })
    })
  }

  const publish = (word: LanguageLearningWord, audio: Blob) => {
    if (options.isDisposed()) {
      return
    }

    const key = getWordKey(word)
    const url = URL.createObjectURL(audio)
    const currentUrls = options.getAudioUrls()
    const previousUrl = currentUrls[key]
    if (previousUrl !== undefined) {
      URL.revokeObjectURL(previousUrl)
    }
    options.setAudioUrls({...currentUrls, [key]: url})
    requestAutoplay(key)
  }

  const replay = (word: LanguageLearningWord) => {
    requestAutoplay(getWordKey(word))
  }

  return {publish, replay}
}

interface GeneratePronunciationOptions {
  readonly audioRepository: LanguageLearningWordAudioRepository
  readonly downloadIfMissing: boolean
  readonly isCurrent: () => boolean
  readonly modelAssets: ModelAssetManager
  readonly onMissingModel: (request: PendingPronunciation) => void
  readonly publish: (word: LanguageLearningWord, audio: Blob) => void
  readonly request: PendingPronunciation
  readonly signal: AbortSignal
  readonly setError: (message: string) => void
  readonly setLoadingKey: (key: string | null) => void
}

const generatePronunciation = (options: GeneratePronunciationOptions) => {
  const key = getWordKey(options.request.word)
  options.setLoadingKey(key)
  return options.modelAssets
    .runAfterVoiceModel({
      downloadIfMissing: options.downloadIfMissing,
      modelId: options.request.modelId,
      task: () =>
        generateLanguageLearningWordPronunciation({
          language: options.request.word.language,
          modelId: options.request.modelId,
          signal: options.signal,
          text: options.request.word.value,
          voiceId: options.request.voiceId,
        }),
    })
    .then(async (result) => {
      if (!options.isCurrent()) {
        return
      }

      switch (result.status) {
        case 'missing':
          options.setLoadingKey(null)
          options.onMissingModel(options.request)
          return
        case 'cancelled':
          options.setLoadingKey(null)
          return
        case 'error':
          options.setLoadingKey(null)
          options.setError(result.message)
          return
        case 'complete': {
          const pronunciation = result.value
          switch (pronunciation.status) {
            case 'cancelled':
              options.setLoadingKey(null)
              return
            case 'error':
              options.setLoadingKey(null)
              options.setError(pronunciation.message)
              return
            case 'complete':
              try {
                await options.audioRepository.save(
                  options.request.word,
                  pronunciation.audio,
                  options.request.audioOwner,
                )
              } catch (reason: unknown) {
                if (options.isCurrent()) {
                  options.setError(getFailureMessage(reason))
                }
              }
              if (!options.isCurrent()) {
                await options.audioRepository
                  .delete(options.request.word, options.request.audioOwner)
                  .catch(() => undefined)
                return
              }
              options.publish(options.request.word, pronunciation.audio)
              options.setLoadingKey(null)
          }
        }
      }
    })
    .catch((reason: unknown) => {
      if (options.isCurrent()) {
        options.setLoadingKey(null)
        options.setError(getFailureMessage(reason))
      }
    })
}

export interface LanguageLearningWordPronunciationState {
  readonly audioUrl: (word: LanguageLearningWord) => string | null
  readonly autoplayKey: () => string | null
  readonly cancelDownload: () => void
  readonly confirmDownload: () => void
  readonly error: () => string | null
  readonly isLoading: (word: LanguageLearningWord) => boolean
  readonly pendingModelId: () => AutomaticDialogueSettings['modelId'] | null
  readonly pendingWord: () => LanguageLearningWord | null
  readonly remove: (word: LanguageLearningWord) => void
  readonly request: (word: LanguageLearningWord) => void
}

// oxlint-disable-next-line eslint/max-lines-per-function -- Owns one pronunciation request lifecycle and its reactive state.
export const useLanguageLearningWordPronunciation = (): LanguageLearningWordPronunciationState => {
  const modelAssets = useModelAssetManager()
  const [audioUrls, setAudioUrls] = createSignal<AudioUrlMap>({})
  const [autoplayKey, setAutoplayKey] = createSignal<string | null>(null)
  const [error, setError] = createSignal<string | null>(null)
  const [loadingKey, setLoadingKey] = createSignal<string | null>(null)
  const [pendingRequest, setPendingRequest] = createSignal<PendingPronunciation | null>(null)
  let audioRepository: LanguageLearningWordAudioRepository | null = null
  let activeGeneration: {readonly controller: AbortController; readonly key: string} | null = null
  let disposed = false
  const requestRevisions = new Map<string, number>()
  const publisher = createAudioPublisher({
    getAudioUrls: audioUrls,
    getAutoplayKey: autoplayKey,
    isDisposed: () => disposed,
    setAudioUrls,
    setAutoplayKey,
  })

  const getAudioRepository = () => {
    if (audioRepository === null) {
      audioRepository = createLanguageLearningWordAudioRepository()
    }

    return audioRepository
  }

  const isCurrentRequest = (request: PendingPronunciation) =>
    !disposed && requestRevisions.get(getWordKey(request.word)) === request.revision

  const generate = (request: PendingPronunciation, downloadIfMissing: boolean) => {
    activeGeneration?.controller.abort()
    const controller = new AbortController()
    const key = getWordKey(request.word)
    activeGeneration = {controller, key}
    generatePronunciation({
      audioRepository: getAudioRepository(),
      downloadIfMissing,
      isCurrent: () => isCurrentRequest(request),
      modelAssets,
      onMissingModel: setPendingRequest,
      publish: publisher.publish,
      request,
      setError,
      setLoadingKey,
      signal: controller.signal,
    })
      .finally(() => {
        if (activeGeneration?.controller === controller) {
          activeGeneration = null
        }
      })
      .catch(() => undefined)
  }

  const request = (word: LanguageLearningWord) => {
    const key = getWordKey(word)
    const currentUrls = audioUrls()
    if (currentUrls[key] !== undefined) {
      publisher.replay(word)
      return
    }

    if (loadingKey() !== null) {
      return
    }

    const revision = (requestRevisions.get(key) ?? 0) + 1
    requestRevisions.set(key, revision)

    setError(null)
    setLoadingKey(key)
    Promise.resolve()
      .then(async () => {
        const storedAudio = await getAudioRepository().get(word)
        if (disposed || requestRevisions.get(key) !== revision) {
          return
        }

        if (storedAudio !== null) {
          setLoadingKey(null)
          publisher.publish(word, storedAudio)
          return
        }

        const settings = createAutomaticDialogueSettingsRepository(globalThis.localStorage).load()
        const downloaded = await isSupertonicModelDownloaded({modelId: settings.modelId})
        if (disposed || requestRevisions.get(key) !== revision) {
          return
        }

        const pending = {
          audioOwner: globalThis.crypto.randomUUID(),
          modelId: settings.modelId,
          revision,
          voiceId: settings.voiceId,
          word,
        }
        setLoadingKey(null)
        if (downloaded) {
          generate(pending, false)
          return
        }

        setPendingRequest(pending)
      })
      .catch((reason: unknown) => {
        if (!disposed && requestRevisions.get(key) === revision) {
          setLoadingKey(null)
          setError(getFailureMessage(reason))
        }
      })
  }

  const confirmDownload = () => {
    const request = pendingRequest()
    setPendingRequest(null)
    if (request !== null && isCurrentRequest(request)) {
      generate(request, true)
    }
  }

  const cancelDownload = () => setPendingRequest(null)
  const remove = (word: LanguageLearningWord) => {
    const key = getWordKey(word)
    requestRevisions.set(key, (requestRevisions.get(key) ?? 0) + 1)
    if (activeGeneration?.key === key) {
      activeGeneration.controller.abort()
      activeGeneration = null
    }
    if (loadingKey() === key) {
      setLoadingKey(null)
    }
    const currentUrls = audioUrls()
    const url = currentUrls[key]
    if (url !== undefined) {
      URL.revokeObjectURL(url)
      const nextUrls = {...currentUrls}
      delete nextUrls[key]
      setAudioUrls(nextUrls)
    }
    const pending = pendingRequest()
    if (pending !== null && getWordKey(pending.word) === key) {
      setPendingRequest(null)
    }
    getAudioRepository()
      .delete(word)
      .catch((reason: unknown) => {
        if (!disposed) {
          setError(getFailureMessage(reason))
        }
      })
  }

  onCleanup(() => {
    disposed = true
    activeGeneration?.controller.abort()
    activeGeneration = null
    for (const url of Object.values(audioUrls())) {
      URL.revokeObjectURL(url)
    }
  })

  return {
    audioUrl: (word) => audioUrls()[getWordKey(word)] ?? null,
    autoplayKey,
    cancelDownload,
    confirmDownload,
    error,
    isLoading: (word) => loadingKey() === getWordKey(word),
    pendingModelId: () => pendingRequest()?.modelId ?? null,
    pendingWord: () => pendingRequest()?.word ?? null,
    remove,
    request,
  }
}
