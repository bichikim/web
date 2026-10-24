import {Channel, invoke, isTauri} from '@tauri-apps/api/core'
import {captureAudio} from './capture-audio'
import {SpeechConnectionError} from './connection-error'
import {parseLiveEvent} from './parse-live-event'
import {loadReadCue} from './load-read-cue'
import type {VoiceAudio} from './synthesis'

interface LiveTransport {
  readonly peer: RTCPeerConnection
  readonly channel: RTCDataChannel
  readonly context: AudioContext
  readonly source: ConstantSourceNode
  readonly track: MediaStreamTrack
  readonly cue: AudioBufferSourceNode
}
const closeTransport = (transport: LiveTransport) => {
  transport.channel.close()
  transport.peer.close()
  transport.track.stop()
  transport.source.stop()
  transport.source.disconnect()
  transport.cue.disconnect()
  transport.context.close().catch(() => undefined)
}
const logFailure = async (peer: RTCPeerConnection, cause: unknown) => {
  const packets: Array<{type: string; sent?: number; received?: number; energy?: number}> = []
  const report = await peer.getStats()
  report.forEach((value) => {
    if (value.type === 'inbound-rtp' || value.type === 'outbound-rtp') {
      packets.push({
        energy: value.totalAudioEnergy,
        received: value.packetsReceived,
        sent: value.packetsSent,
        type: value.type,
      })
    }
  })
  console.warn(
    'Poffo ChatGPT settings voice transport',
    JSON.stringify({
      capture: cause instanceof Error ? cause.cause : undefined,
      code: cause instanceof SpeechConnectionError ? cause.code : 'native',
      packets,
    }),
  )
}
const createTransport = (): LiveTransport => {
  const peer = new RTCPeerConnection({iceServers: []})
  const channel = peer.createDataChannel('oai-events')
  const context = new AudioContext({sampleRate: 48_000})
  const source = context.createConstantSource()
  source.offset.value = 0
  const destination = context.createMediaStreamDestination()
  const cue = context.createBufferSource()
  cue.connect(destination)
  source.connect(destination)
  source.start()
  const [track] = destination.stream.getAudioTracks()
  peer.addTrack(track, destination.stream)
  return {channel, context, cue, peer, source, track}
}
const observeConnection = (
  transport: LiveTransport,
  signal: AbortSignal,
  onAudio?: (audio: VoiceAudio) => void,
) => {
  const prepared = Promise.withResolvers<Awaited<ReturnType<typeof captureAudio>>>()
  const failed = Promise.withResolvers<never>()
  failed.promise.catch(() => undefined)
  let capture: Awaited<ReturnType<typeof captureAudio>> | null = null
  let ready = false
  let ended: number | null = null
  const update = () => {
    if (
      ready &&
      capture !== null &&
      transport.channel.readyState === 'open' &&
      transport.peer.connectionState === 'connected'
    ) {
      prepared.resolve(capture)
    }
  }
  transport.peer.onconnectionstatechange = () => {
    if (
      transport.peer.connectionState === 'failed' ||
      transport.peer.connectionState === 'closed'
    ) {
      failed.reject(new SpeechConnectionError('network'))
    }
    update()
  }
  transport.channel.onopen = update
  const disconnected = () => failed.reject(new SpeechConnectionError('network'))
  transport.channel.onclose = disconnected
  transport.channel.onerror = disconnected
  transport.channel.onmessage = (event: MessageEvent<string>) => {
    const message = parseLiveEvent(event.data)
    switch (message.type) {
      case 'ready':
        ready = true
        update()
        break
      case 'failed':
        failed.reject(new SpeechConnectionError('unavailable'))
        break
      case 'ended':
        ended = message.endMilliseconds
        capture?.complete(message.endMilliseconds)
        break
      case 'ignored':
        break
      default: {
        const never: never = message
        throw new Error(`Unknown voice event: ${never}`)
      }
    }
  }
  transport.peer.ontrack = (event) => {
    if (event.track.kind === 'audio') {
      captureAudio(transport.context, new MediaStream([event.track]), signal, onAudio).then(
        (value) => {
          if (signal.aborted) {
            value.dispose()
            return
          }
          capture = value
          if (ended !== null) {
            value.complete(ended)
          }
          value.audio.catch(failed.reject)
          update()
        },
        failed.reject,
      )
    }
  }
  const abort = () => failed.reject(signal.reason)
  signal.addEventListener('abort', abort, {once: true})
  return {
    dispose: () => {
      signal.removeEventListener('abort', abort)
      capture?.dispose()
      transport.peer.onconnectionstatechange = null
      transport.peer.ontrack = null
      transport.channel.onmessage = null
      transport.channel.onopen = null
      transport.channel.onclose = null
      transport.channel.onerror = null
    },
    failed,
    prepared: prepared.promise,
  }
}
interface ConnectOptions {
  readonly transport: LiveTransport
  readonly requestId: string
  readonly signal: AbortSignal
  readonly text: string
  readonly language: string
}
const connect = async ({transport, requestId, signal, text, language}: ConnectOptions) => {
  const close = () => invoke('close_codex_live_voice', {requestId}).catch(() => undefined)
  signal.addEventListener('abort', close, {once: true})
  const started = new Channel<null>()
  started.onmessage = () => {
    if (signal.aborted) {
      close()
    }
  }
  try {
    const offer = await transport.peer.createOffer()
    // Match the current Codex transport's RTP extension set.
    const sdp = offer.sdp
      ?.split('\r\n')
      .filter((line) => !line.includes('urn:ietf:params:rtp-hdrext:ssrc-audio-level'))
      .join('\r\n')
    await transport.peer.setLocalDescription({sdp, type: 'offer'})
    signal.throwIfAborted()
    const answer = await invoke<{sdp: string}>('start_codex_live_voice', {
      language,
      offer: transport.peer.localDescription?.sdp,
      requestId,
      started,
      text,
    })
    signal.throwIfAborted()
    await transport.peer.setRemoteDescription({sdp: answer.sdp, type: 'answer'})
    signal.throwIfAborted()
    await invoke('attach_codex_live_voice', {requestId})
  } finally {
    signal.removeEventListener('abort', close)
  }
}

/** Receives one ChatGPT settings voice utterance through an isolated native session without opening a microphone. */
export const generateLiveSpeech = async (
  text: string,
  caller: AbortSignal,
  language: string,
  onAudio?: (audio: VoiceAudio) => void,
): Promise<VoiceAudio> => {
  caller.throwIfAborted()
  if (!isTauri()) {
    throw new SpeechConnectionError('desktopOnly')
  }
  const lifetime = new AbortController()
  const signal = AbortSignal.any([caller, lifetime.signal])
  const requestId = crypto.randomUUID()
  const startedAt = Date.now()
  const transport = createTransport()
  let streaming = false
  const receive =
    onAudio === undefined
      ? undefined
      : (audio: VoiceAudio) => {
          signal.throwIfAborted()
          if (!streaming) {
            console.info(
              'Poffo ChatGPT speech started',
              JSON.stringify({elapsedMilliseconds: Date.now() - startedAt, requestId}),
            )
            streaming = true
          }
          onAudio(audio)
        }
  const observation = observeConnection(transport, signal, receive)
  const wait = async <T>(value: Promise<T>): Promise<T> =>
    Promise.race([value, observation.failed.promise])
  const CONNECTION_TIMEOUT = 30_000
  const timer = setTimeout(
    () => observation.failed.reject(new SpeechConnectionError('network')),
    CONNECTION_TIMEOUT,
  )
  try {
    // User-initiated AudioContexts can already be running before signaling is ready.
    await wait(transport.context.suspend())
    transport.cue.buffer = await wait(loadReadCue(transport.context, signal))
    await wait(connect({language, requestId, signal, text, transport}))
    const recording = await wait(observation.prepared)
    clearTimeout(timer)
    signal.throwIfAborted()
    recording.begin()
    await wait(transport.context.resume())
    const CUE_LEAD_SECONDS = 0.5
    transport.cue.start(transport.context.currentTime + CUE_LEAD_SECONDS)
    const audio = await wait(recording.audio)
    console.info(
      'Poffo ChatGPT speech ready',
      JSON.stringify({
        elapsedMilliseconds: Date.now() - startedAt,
        frames: audio.samples.length,
        requestId,
        sampleRate: audio.sampleRate,
      }),
    )
    return audio
  } catch (cause) {
    if (!signal.aborted) {
      await logFailure(transport.peer, cause)
    }
    throw cause
  } finally {
    clearTimeout(timer)
    lifetime.abort()
    observation.dispose()
    closeTransport(transport)
    await invoke('close_codex_live_voice', {requestId}).catch(() => undefined)
  }
}
