import {createEffect, createSignal, onCleanup} from 'solid-js'
import {usePreference} from 'src/hooks/use-preference'
import {replaceBlobObjectUrl} from '../../features/blob-object-url'

import * as m from '@paraglide/message'
import {
  type AutomaticDialogueSettings,
  createAutomaticDialoguePreferenceOptions,
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

interface PendingPronunciation extends PendingSettingsPronunciation {
  readonly audioOwner: string
  readonly modelId: AutomaticDialogueSettings['modelId']
  readonly voiceId: AutomaticDialogueSettings['voiceId']
}

interface PendingSettingsPronunciation {
  readonly signal: AbortSignal
  readonly word: LanguageLearningWord
}

interface ActivePronunciationRequest {
  readonly controller: AbortController
  readonly key: string
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
    const currentUrls = options.getAudioUrls()
    const url = replaceBlobObjectUrl(currentUrls[key] ?? null, () => audio, {order: 'create-first'})
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
          signal: options.request.signal,
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
                  options.setLoadingKey(null)
                  return
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
  const [automaticSettings] = usePreference(createAutomaticDialoguePreferenceOptions())
  const [audioUrls, setAudioUrls] = createSignal<AudioUrlMap>({})
  const [autoplayKey, setAutoplayKey] = createSignal<string | null>(null)
  const [error, setError] = createSignal<string | null>(null)
  const [loadingKey, setLoadingKey] = createSignal<string | null>(null)
  const [pendingRequest, setPendingRequest] = createSignal<PendingPronunciation | null>(null)
  const [pendingSettingsRequest, setPendingSettingsRequest] =
    createSignal<PendingSettingsPronunciation | null>(null)
  let audioRepository: LanguageLearningWordAudioRepository | null = null
  let activeRequest: ActivePronunciationRequest | null = null
  let disposed = false
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

  const abortActiveRequest = () => {
    activeRequest?.controller.abort()
    activeRequest = null
  }

  const cancelActiveRequest = () => {
    abortActiveRequest()
    setPendingRequest(null)
    setPendingSettingsRequest(null)
    setLoadingKey(null)
  }

  const generate = (request: PendingPronunciation, downloadIfMissing: boolean) => {
    generatePronunciation({
      audioRepository: getAudioRepository(),
      downloadIfMissing,
      isCurrent: () => !disposed && !request.signal.aborted,
      modelAssets,
      onMissingModel: setPendingRequest,
      publish: publisher.publish,
      request,
      setError,
      setLoadingKey,
    }).catch(() => undefined)
  }

  const preparePronunciation = async (
    request: PendingSettingsPronunciation,
    settings: AutomaticDialogueSettings,
  ) => {
    try {
      const downloaded = await isSupertonicModelDownloaded({modelId: settings.modelId})
      if (disposed || request.signal.aborted) {
        return
      }

      const pending: PendingPronunciation = {
        audioOwner: globalThis.crypto.randomUUID(),
        modelId: settings.modelId,
        signal: request.signal,
        voiceId: settings.voiceId,
        word: request.word,
      }
      setLoadingKey(null)
      if (downloaded) {
        generate(pending, false)
        return
      }

      setPendingRequest(pending)
    } catch (reason: unknown) {
      if (!disposed && !request.signal.aborted) {
        setLoadingKey(null)
        setError(getFailureMessage(reason))
      }
    }
  }

  const request = (word: LanguageLearningWord) => {
    const key = getWordKey(word)
    const currentUrls = audioUrls()
    if (currentUrls[key] !== undefined) {
      cancelActiveRequest()
      publisher.replay(word)
      return
    }

    abortActiveRequest()
    const controller = new AbortController()
    const {signal} = controller
    activeRequest = {controller, key}
    setPendingRequest(null)
    setPendingSettingsRequest(null)

    setError(null)
    setLoadingKey(key)
    Promise.resolve()
      .then(async () => {
        const storedAudio = await getAudioRepository().get(word)
        if (disposed || signal.aborted) {
          return
        }

        if (storedAudio !== null) {
          setLoadingKey(null)
          publisher.publish(word, storedAudio)
          return
        }

        const settings = automaticSettings()
        if (settings === null) {
          setPendingSettingsRequest({signal, word})
          return
        }
        await preparePronunciation({signal, word}, settings)
      })
      .catch((reason: unknown) => {
        if (!disposed && !signal.aborted) {
          setLoadingKey(null)
          setError(getFailureMessage(reason))
        }
      })
  }

  createEffect(() => {
    const request = pendingSettingsRequest()
    if (request === null) {
      return
    }

    const settings = automaticSettings()
    if (settings !== null) {
      setPendingSettingsRequest(null)
      preparePronunciation(request, settings).catch(() => undefined)
    }
  })

  const confirmDownload = () => {
    const request = pendingRequest()
    setPendingRequest(null)
    if (request !== null && !disposed && !request.signal.aborted) {
      generate(request, true)
    }
  }

  const cancelDownload = () => setPendingRequest(null)
  const remove = (word: LanguageLearningWord) => {
    const key = getWordKey(word)
    if (activeRequest?.key === key) {
      abortActiveRequest()
    }
    if (loadingKey() === key) {
      setLoadingKey(null)
    }
    const currentUrls = audioUrls()
    const url = currentUrls[key]
    if (url !== undefined) {
      replaceBlobObjectUrl(url, () => null)
      const nextUrls = {...currentUrls}
      delete nextUrls[key]
      setAudioUrls(nextUrls)
    }
    const pending = pendingRequest()
    if (pending !== null && getWordKey(pending.word) === key) {
      setPendingRequest(null)
    }
    const settingsPending = pendingSettingsRequest()
    if (settingsPending !== null && getWordKey(settingsPending.word) === key) {
      setPendingSettingsRequest(null)
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
    abortActiveRequest()
    for (const url of Object.values(audioUrls())) {
      replaceBlobObjectUrl(url, () => null)
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
