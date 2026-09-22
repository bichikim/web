import {getExceptionMessage} from 'src/features/error-detail'
import {replaceBlobObjectUrl} from 'src/features/blob-object-url'
import {createSignal, onCleanup} from 'solid-js'
import {isNonBlankString} from 'src/utils/is-non-blank-string'
import {CONNECTION_CONTEXT_SECONDS, SAMPLE_RATE} from '../sound-generation/connection'
import type {SoundMessage} from '../sound-generation/worker'
import {assembleJoin, prepareJoin, type StereoAudio} from './audio'

export interface JoinRequest {
  readonly first: File
  readonly second: File
  readonly trimEnd: number
  readonly trimStart: number
  readonly connectionSeconds: number
  readonly prompt: string
}
const MAX_SECONDS = 600
const BUSY_ERROR_MESSAGE = '이미 연결 생성 중인 작업이 있습니다. 완료 후 다시 시도해 주세요.'

async function decode(blob: Blob): Promise<StereoAudio> {
  const context = new AudioContext({sampleRate: SAMPLE_RATE})
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer())
    if (buffer.duration > MAX_SECONDS) {
      throw new Error('파일은 각각 10분 이하로 선택해 주세요.')
    }
    return {
      left: buffer.getChannelData(0).slice(),
      right: buffer.getChannelData(Math.min(1, buffer.numberOfChannels - 1)).slice(),
    }
  } finally {
    await context.close()
  }
}

export function useSoundJoining() {
  const [busy, setBusy] = createSignal(false)
  const [status, setStatus] = createSignal('두 파일에서 연결할 위치를 고른 뒤 생성하세요.')
  const [error, setError] = createSignal<string | null>(null)
  const [url, setUrl] = createSignal<string | null>(null)
  let revision = 0
  let worker: Worker | null = null
  let cancel: (() => void) | null = null
  const stop = () => {
    revision += 1
    worker?.terminate()
    worker = null
    cancel?.()
    cancel = null
    setBusy(false)
    if (error() === BUSY_ERROR_MESSAGE) {
      setError(null)
    }
    setStatus('연결 생성을 중지했습니다.')
  }
  onCleanup(() => {
    stop()
    const value = url()
    if (value !== null) {
      URL.revokeObjectURL(value)
    }
  })
  const generate = async (request: JoinRequest) => {
    if (busy()) {
      setError(BUSY_ERROR_MESSAGE)
      setStatus('연결 생성이 진행 중입니다. 완료 후 다시 시도해 주세요.')
      return
    }
    revision += 1
    const current = revision
    setBusy(true)
    setError(null)
    setStatus('파일을 읽고 연결 구간을 준비하고 있어요…')
    try {
      if (!isNonBlankString(request.prompt)) {
        throw new Error('영어 소리 설명을 입력해 주세요.')
      }
      const [first, second] = await Promise.all([decode(request.first), decode(request.second)])
      if (current !== revision) {
        return
      }
      const plan = prepareJoin({...request, first, second})
      const blob = await new Promise<Blob>((resolve, reject) => {
        cancel = () => reject(new Error('생성 취소'))
        const execution = new Worker(new URL('../sound-generation/worker.ts', import.meta.url), {
          type: 'module',
        })
        worker = execution
        execution.onmessage = (event: MessageEvent<SoundMessage>) => {
          if (current !== revision) {
            return
          }
          const message = event.data
          switch (message.type) {
            case 'progress':
              setStatus(message.message)
              return
            case 'error':
              reject(new Error(message.message))
              return
            case 'result':
              resolve(message.blob)
              return
          }
          message satisfies never
        }
        execution.onerror = (event) =>
          reject(new Error(event.message || '연결 실행기를 불러오지 못했습니다.'))
        execution.postMessage({
          inpaint: {
            ...plan.context,
            end: CONNECTION_CONTEXT_SECONDS + request.connectionSeconds / 2,
            start: CONNECTION_CONTEXT_SECONDS - request.connectionSeconds / 2,
          },
          prompt: request.prompt,
          seconds: 12,
        })
      })
      if (current !== revision) {
        return
      }
      worker?.terminate()
      worker = null
      cancel = null
      setStatus('원본과 연결음을 합치고 있어요…')
      const generated = await decode(blob)
      if (current !== revision) {
        return
      }
      const joined = assembleJoin(plan, generated)
      setError(null)
      setUrl(replaceBlobObjectUrl(url(), () => joined))
      setStatus(`연결 완료 · ${(plan.left.length / SAMPLE_RATE).toFixed(1)}초`)
    } catch (cause) {
      if (current === revision) {
        setError(getExceptionMessage(cause, () => String(cause)))
      }
    } finally {
      if (current === revision) {
        worker?.terminate()
        worker = null
        cancel = null
        setBusy(false)
      }
    }
  }
  return {busy, error, generate, status, stop, url}
}
