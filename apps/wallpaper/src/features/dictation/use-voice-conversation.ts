import {type Accessor, batch, createEffect, createSignal, onCleanup, untrack} from 'solid-js'
import {createDictationPreferences} from './preferences'
import {startSpeechTurn} from './start-speech-turn'
import type {SpeechCapture} from './start-speech-capture'
import {transcribeAudio} from './transcribe-audio'
import type {DictationState} from './types'

interface UseVoiceConversationProps {
  /** Disabling ends the mode and discards pending input; omission enables it. */
  readonly enabled?: Accessor<boolean>
  /** Pauses listening during reply generation or narration; omission never pauses. */
  readonly paused?: Accessor<boolean>
  /** Sends one recognized utterance; completion allows the next turn once unpaused. */
  readonly onSend: (text: string) => void | Promise<void>
  /** Reports actual capture/recognition activity, excluding reply waiting; omitted when unused. */
  readonly onActive?: (active: boolean) => void
  /** Cancels the caller's reply and narration before microphone takeover; omitted when there is no external work. */
  readonly onInterrupt?: () => void
}

/** Alternates local utterance capture, recognition, submission, and reply waiting until cancelled. */
export const useVoiceConversation = (props: UseVoiceConversationProps) => {
  const preferences = createDictationPreferences()
  const [active, setActive] = createSignal(false)
  const [state, setState] = createSignal<DictationState>('idle')
  const [level, setLevel] = createSignal(0)
  const [error, setError] = createSignal<string | null>(null)
  const [revision, setRevision] = createSignal(0)
  let controller: AbortController | null = null
  let currentCapture: SpeechCapture | null = null
  const suspend = () => {
    controller?.abort()
    controller = null
    currentCapture = null
    setLevel(0)
    setState(active() ? 'waiting' : 'idle')
  }
  const cancel = () => {
    setActive(false)
    suspend()
  }
  const listen = async () => {
    const request = new AbortController()
    controller = request
    setState('starting')
    try {
      const settings = await preferences.read()
      request.signal.throwIfAborted()
      const capture = await startSpeechTurn(request.signal, (value) => {
        if (controller === request && state() === 'recording') {
          setLevel(value)
        }
      })
      request.signal.throwIfAborted()
      currentCapture = capture
      setState('recording')
      const audio = await capture.audio
      request.signal.throwIfAborted()
      currentCapture = null
      setLevel(0)
      if (audio.length > 0) {
        setState('transcribing')
        const text = await transcribeAudio({...settings, audio, signal: request.signal})
        request.signal.throwIfAborted()
        setState('waiting')
        if (text.trim() !== '') {
          await props.onSend(text)
        }
      }
    } catch (cause) {
      if (!request.signal.aborted) {
        setError(cause instanceof Error ? cause.message : '음성을 입력하지 못했어요.')
        cancel()
      }
    } finally {
      if (controller === request) {
        controller = null
        currentCapture = null
        setLevel(0)
        setState(active() ? 'waiting' : 'idle')
        setRevision((value) => value + 1)
      }
    }
  }
  createEffect(() => {
    const enabled = props.enabled?.() !== false
    const paused = props.paused?.() === true
    const running = active()
    const phase = state()
    revision()
    untrack(() => {
      if (!enabled) {
        cancel()
      } else if (running && paused && (phase === 'starting' || phase === 'recording')) {
        suspend()
      } else if (running && !paused && phase === 'waiting' && controller === null) {
        listen()
      }
    })
  })
  createEffect(() => {
    const phase = state()
    const capturing = phase !== 'idle' && phase !== 'waiting'
    untrack(() => props.onActive?.(capturing))
  })
  onCleanup(() => {
    cancel()
    preferences.close()
    props.onActive?.(false)
  })
  const toggle = () => {
    if (active() && state() !== 'waiting') {
      cancel()
      return
    }
    if (props.enabled?.() === false) {
      return
    }
    batch(() => {
      if (state() === 'waiting' || props.paused?.() === true) {
        suspend()
        props.onInterrupt?.()
      }
      setError(null)
      setState('waiting')
      setActive(true)
      setRevision((value) => value + 1)
    })
  }
  /** Ends the current utterance for submission without ending continuous mode; other phases do nothing. */
  const submit = () => {
    const capture = currentCapture
    if (
      capture === null ||
      state() !== 'recording' ||
      props.enabled?.() === false ||
      props.paused?.() === true
    ) {
      return
    }
    currentCapture = null
    setLevel(0)
    setState('transcribing')
    capture.stop()
  }
  return {active, cancel, error, level, state, submit, toggle}
}
