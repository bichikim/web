import {type Accessor, createEffect, createSignal, onCleanup, untrack} from 'solid-js'
import {startSpeechTurn} from './start-speech-turn'
import type {SpeechCapture} from './start-speech-capture'
import {transcribeAudio} from './transcribe-audio'
import {createDictationPreferences} from './preferences'
import type {DictationState} from './types'

interface UseDictationProps {
  /** Enables capture by default; disabling cancels capture and discards pending transcripts. */
  readonly enabled?: Accessor<boolean>
  /** Receives each completed utterance in order without submitting it; listening continues. */
  readonly onText?: (text: string) => void
  /** Reports capture and pending recognition activity; never called after disposal. */
  readonly onActive?: (active: boolean) => void
}
interface DictationSession {
  capture: SpeechCapture | null
  stopped: boolean
  readonly microphone: AbortController
  readonly recognition: AbortController
  pending: Promise<void>
}

/** Appends silence-delimited utterances while continuing to capture the next utterance. */
export const useDictation = (props: UseDictationProps) => {
  const preferences = createDictationPreferences()
  const [state, setState] = createSignal<DictationState>('idle')
  const [level, setLevel] = createSignal(0)
  const [error, setError] = createSignal<string | null>(null)
  let session: DictationSession | null = null
  let completion = Promise.resolve(true)
  const cancel = () => {
    session?.microphone.abort()
    session?.recognition.abort()
    session = null
    setState('idle')
    setLevel(0)
  }
  const fail = (current: DictationSession, cause: unknown) => {
    if (session === current && !current.recognition.signal.aborted) {
      setError(cause instanceof Error ? cause.message : '음성을 입력하지 못했어요.')
      cancel()
    }
  }
  const enqueue = (current: DictationSession, audio: Float32Array) => {
    current.pending = current.pending
      .then(async () => {
        const {signal} = current.recognition
        signal.throwIfAborted()
        const settings = await preferences.read()
        signal.throwIfAborted()
        const text = await transcribeAudio({...settings, audio, signal})
        signal.throwIfAborted()
        if (text.trim() !== '') {
          props.onText?.(text)
        }
      })
      .catch((cause: unknown) => fail(current, cause))
  }
  const listen = async (current: DictationSession) => {
    const {signal} = current.microphone
    const receiveLevel = (value: number) => {
      if (session === current && !signal.aborted && state() === 'recording') {
        setLevel(value)
      }
    }
    try {
      // oxlint-disable no-await-in-loop -- Each microphone turn begins when the preceding VAD turn ends.
      while (!signal.aborted && !current.stopped) {
        const capture = await startSpeechTurn(signal, receiveLevel)
        signal.throwIfAborted()
        current.capture = capture
        setState('recording')
        const audio = await capture.audio
        current.capture = null
        signal.throwIfAborted()
        setLevel(0)
        if (audio.length > 0) {
          enqueue(current, audio)
        }
      }
      // oxlint-enable no-await-in-loop
    } catch (cause) {
      if (!signal.aborted) {
        fail(current, cause)
      }
    } finally {
      if (session === current) {
        setLevel(0)
        setState('transcribing')
      }
      await current.pending
      if (session === current) {
        session = null
        setState('idle')
      }
    }
    return !current.recognition.signal.aborted
  }
  /** Flushes the last utterance and queued recognition; false means cancelled or failed. */
  const finish = (): Promise<boolean> => {
    const current = session
    if (current === null) {
      return Promise.resolve(true)
    }
    if (!current.stopped) {
      current.stopped = true
      if (current.capture === null) {
        current.microphone.abort()
      } else {
        current.capture.stop()
      }
    }
    setLevel(0)
    setState('transcribing')
    return completion
  }
  const toggle = () => {
    const current = session
    if (current !== null) {
      if (state() === 'recording') {
        finish()
      } else {
        cancel()
      }
      return
    }
    if (props.enabled?.() === false) {
      return
    }
    const next: DictationSession = {
      capture: null,
      microphone: new AbortController(),
      pending: Promise.resolve(),
      recognition: new AbortController(),
      stopped: false,
    }
    session = next
    setError(null)
    setState('starting')
    completion = listen(next)
  }
  createEffect(() => {
    if (props.enabled?.() === false) {
      untrack(cancel)
    }
  })
  createEffect(() => {
    const active = state() !== 'idle'
    untrack(() => props.onActive?.(active))
  })
  onCleanup(() => {
    cancel()
    preferences.close()
    props.onActive?.(false)
  })
  return {cancel, error, finish, level, state, toggle}
}
