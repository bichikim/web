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
  normalizeLanguageLearningWordUnicodeValue,
} from '../../features/language-learning'
import {type ModelAssetManager, useModelAssetManager} from '../../features/model-download'
import {isSupertonicModelDownloaded} from '../../features/supertonic'
import {generateLanguageLearningWordPronunciation} from './word-pronunciation'

const getWordKey = (word: LanguageLearningWord) => `${word.language}:${word.value}`
const getAudioResourceKey = (key: string) => normalizeLanguageLearningWordUnicodeValue(key)

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

interface AudioResource {
  /** 정규화된 발음 자원을 공유하는 원문 행의 키입니다. */
  readonly wordKeys: ReadonlyArray<string>
  /** 마지막 원문 행이 해제될 때 폐기할 발음 URL입니다. */
  readonly url: string
}

type AudioResourceMap = Readonly<Record<string, AudioResource>>

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
  /** 정규화된 자원과 원문 참조의 불변 snapshot을 읽습니다. */
  readonly getAudioResources: () => AudioResourceMap
  /** 이번 원문 행의 자동 재생 요청을 읽습니다. */
  readonly getAutoplayKey: () => string | null
  /** owner 정리 이후 URL과 자동 재생 게시를 막습니다. */
  readonly isDisposed: () => boolean
  /** 참조 소유권 변경을 새 snapshot으로 게시합니다. */
  readonly setAudioResources: (value: AudioResourceMap) => void
  /** 자동 재생할 원문 행을 게시하거나 요청을 해제합니다. */
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

    const wordKey = getWordKey(word)
    const resourceKey = getAudioResourceKey(wordKey)
    const currentResources = options.getAudioResources()
    const existing = currentResources[resourceKey]
    const url = existing?.url ?? replaceBlobObjectUrl(null, () => audio, {order: 'create-first'})
    options.setAudioResources({
      ...currentResources,
      [resourceKey]: {
        url,
        wordKeys: [...(existing?.wordKeys ?? []), wordKey],
      },
    })
    requestAutoplay(wordKey)
  }

  const replay = (word: LanguageLearningWord) => {
    const wordKey = getWordKey(word)
    const resourceKey = getAudioResourceKey(wordKey)
    const currentResources = options.getAudioResources()
    const resource = currentResources[resourceKey]
    if (resource !== undefined && !resource.wordKeys.includes(wordKey)) {
      options.setAudioResources({
        ...currentResources,
        [resourceKey]: {
          ...resource,
          wordKeys: [...resource.wordKeys, wordKey],
        },
      })
    }
    requestAutoplay(wordKey)
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
  const [audioResources, setAudioResources] = createSignal<AudioResourceMap>({})
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
    getAudioResources: audioResources,
    getAutoplayKey: autoplayKey,
    isDisposed: () => disposed,
    setAudioResources,
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
    const currentResources = audioResources()
    if (currentResources[getAudioResourceKey(key)] !== undefined) {
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
    const resourceKey = getAudioResourceKey(key)
    const currentResources = audioResources()
    const resource = currentResources[resourceKey]
    const remainingWordKeys = resource?.wordKeys.filter((wordKey) => wordKey !== key) ?? []
    if (resource !== undefined) {
      const nextResources = {...currentResources}
      if (remainingWordKeys.length === 0) {
        replaceBlobObjectUrl(resource.url, () => null)
        delete nextResources[resourceKey]
      } else {
        nextResources[resourceKey] = {...resource, wordKeys: remainingWordKeys}
      }
      setAudioResources(nextResources)
    }
    const pending = pendingRequest()
    if (pending !== null && getWordKey(pending.word) === key) {
      setPendingRequest(null)
    }
    const settingsPending = pendingSettingsRequest()
    if (settingsPending !== null && getWordKey(settingsPending.word) === key) {
      setPendingSettingsRequest(null)
    }
    const otherRequestUsesResource =
      activeRequest !== null && getAudioResourceKey(activeRequest.key) === resourceKey
    const repository = getAudioRepository()
    const removal =
      remainingWordKeys.length > 0 || otherRequestUsesResource
        ? repository.delete(word, undefined, {preserveSharedAudio: true})
        : repository.delete(word)
    removal.catch((reason: unknown) => {
      if (!disposed) {
        setError(getFailureMessage(reason))
      }
    })
  }

  onCleanup(() => {
    disposed = true
    abortActiveRequest()
    for (const resource of Object.values(audioResources())) {
      replaceBlobObjectUrl(resource.url, () => null)
    }
  })

  return {
    audioUrl: (word) => {
      const wordKey = getWordKey(word)
      const resource = audioResources()[getAudioResourceKey(wordKey)]
      return resource?.wordKeys.includes(wordKey) ? resource.url : null
    },
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
