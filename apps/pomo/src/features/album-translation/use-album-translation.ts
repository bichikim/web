import {type Accessor, createMemo, createSignal, onCleanup, untrack} from 'solid-js'

import {supportsWebGpu} from '../text-generation/environment'
import {createLazyClient} from '../text-generation/lazy-client'
import {
  type AlbumTranslationClient,
  createAlbumTranslationClient,
  type CreateAlbumTranslationClientOptions,
} from './client'
import type {AlbumTranslationText, AlbumTranslationWorkerResponse} from './messages'

interface AlbumTranslationIdleState {
  readonly status: 'complete' | 'idle'
}

interface AlbumTranslationBusyState {
  readonly message: string
  readonly progress: number
  readonly status: 'generating' | 'loading'
}

interface AlbumTranslationErrorState {
  readonly message: string
  readonly status: 'error'
}

interface AlbumTranslationUnsupportedState {
  readonly status: 'unsupported'
}

export type AlbumTranslationState =
  | AlbumTranslationBusyState
  | AlbumTranslationErrorState
  | AlbumTranslationIdleState
  | AlbumTranslationUnsupportedState

export interface AlbumTranslationRuntime {
  readonly createClient: (options: CreateAlbumTranslationClientOptions) => AlbumTranslationClient
  readonly supportsWebGpu: () => boolean
}

export interface UseAlbumTranslationProps {
  readonly onComplete: (translations: {
    readonly en: AlbumTranslationText
    readonly ja: AlbumTranslationText
    readonly 'zh-Hans': AlbumTranslationText
  }) => void
  readonly runtime?: AlbumTranslationRuntime
}

export interface AlbumTranslationController {
  readonly isBusy: Accessor<boolean>
  readonly state: Accessor<AlbumTranslationState>
  readonly translate: (input: {readonly description: string; readonly title: string}) => void
}

const DEFAULT_RUNTIME: AlbumTranslationRuntime = {
  createClient: createAlbumTranslationClient,
  supportsWebGpu,
}

export const useAlbumTranslation = (
  props: UseAlbumTranslationProps,
): AlbumTranslationController => {
  const runtime = untrack(() => props.runtime ?? DEFAULT_RUNTIME)
  const [state, setState] = createSignal<AlbumTranslationState>(
    runtime.supportsWebGpu() ? {status: 'idle'} : {status: 'unsupported'},
  )
  const isBusy = createMemo(() => {
    const {status} = state()
    return status === 'generating' || status === 'loading'
  })

  const handleResponse = (response: AlbumTranslationWorkerResponse) => {
    switch (response.type) {
      case 'complete':
        props.onComplete(response.translations)
        setState({status: 'complete'})
        return
      case 'error':
        if (response.restartRequired) {
          clientOwner.dispose()
        }
        setState({message: response.message, status: 'error'})
        return
      case 'loading':
        setState({
          message: `Gemma 4 내려받는 중 · ${response.percentage}%`,
          progress: response.percentage,
          status: 'loading',
        })
        return
      case 'started':
        setState({
          message: '영어·일본어·중국어 초안을 만드는 중…',
          progress: 100,
          status: 'generating',
        })
        return
    }

    response satisfies never
  }

  const clientOwner = createLazyClient(() => runtime.createClient({onResponse: handleResponse}))

  const translate = (input: {readonly description: string; readonly title: string}) => {
    if (isBusy() || input.title.trim().length === 0 || !runtime.supportsWebGpu()) {
      return
    }

    setState({message: 'Gemma 4를 준비하는 중…', progress: 0, status: 'loading'})
    clientOwner.get().translate(input)
  }

  onCleanup(clientOwner.dispose)

  return {isBusy, state, translate}
}
