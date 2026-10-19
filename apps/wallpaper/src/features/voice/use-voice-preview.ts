import {type Accessor, createEffect, createSignal, onCleanup, untrack} from 'solid-js'
import type {PoffoVoice} from '@winter-love/wallpaper/settings/voice'
import {createVoiceClient} from './client'
import type {VoiceStatus} from './readout'

export const useVoicePreview = (voice: Accessor<PoffoVoice>) => {
  const [status, setStatus] = createSignal<VoiceStatus>('idle')
  const [error, setError] = createSignal<string | null>(null)
  const client = createVoiceClient()
  let active: AbortController | null = null
  const stop = () => {
    active?.abort()
    active = null
    setStatus('idle')
  }
  createEffect(() => {
    voice()
    untrack(stop)
  })
  const play = async () => {
    if (active !== null) {
      stop()
      return
    }
    const request = new AbortController()
    active = request
    setError(null)
    const playback: Promise<void>[] = []
    let playbackError: unknown = null
    const receive = (audio: Parameters<typeof client.play>[0]) => {
      request.signal.throwIfAborted()
      if (active === request) {
        setStatus('playing')
      }
      const played = client.play(audio, voice(), request.signal)
      played.catch((cause: unknown) => {
        playbackError = cause
        request.abort()
      })
      playback.push(played)
    }
    try {
      const audio = await client.prepare(
        '안녕하세요. 새로 도착한 말풍선을 읽어 드릴게요.',
        voice(),
        request.signal,
        {
          audio: receive,
          status: (status) => {
            if (active === request) {
              setStatus(status)
            }
          },
        },
      )
      request.signal.throwIfAborted()
      if (playback.length === 0) {
        receive(audio)
      }
      await Promise.all(playback)
    } catch (cause) {
      const failure = playbackError ?? (request.signal.aborted ? null : cause)
      if (failure !== null) {
        console.error('Poffo voice preview failed', failure)
        setError(failure instanceof Error ? failure.message : '미리듣기에 실패했어요.')
      }
      request.abort()
    } finally {
      if (active === request) {
        active = null
        setStatus('idle')
      }
    }
  }
  onCleanup(() => {
    stop()
    client.dispose()
  })
  return {error, play, status}
}
