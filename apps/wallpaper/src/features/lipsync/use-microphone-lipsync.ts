import {type Accessor, createEffect, createMemo, createSignal, onCleanup, untrack} from 'solid-js'
import {
  DEFAULT_MICROPHONE_THRESHOLD,
  type PoffoLipSync,
} from '@winter-love/wallpaper/settings/lipsync'
import {startMicrophone} from './start-microphone'
import {createMicrophoneAnalysis} from './create-microphone-analysis'
import {createLipSyncPublisher} from './channel'
import {createMicrophonePublisher, subscribeMicrophoneRequests} from './microphone-channel'
import type {MicrophoneDevice, MicrophoneState} from './types'
import {readMicrophones} from './read-microphones'

interface UseMicrophoneLipSyncProps {
  /** Character widget owning capture; undefined releases every microphone resource. */
  readonly widgetId: Accessor<string | undefined>
  /** Lip sync settings only; narration and bubble selection never control capture. */
  readonly settings: Accessor<PoffoLipSync | undefined>
}

/** Captures microphone poses for one live widget, sharing its output with settings and previews. */
export const useMicrophoneLipSync = (props: UseMicrophoneLipSyncProps) => {
  const [revision, setRevision] = createSignal(0)
  const selection = createMemo(
    () => {
      const settings = props.settings()
      const widgetId = props.widgetId()
      return settings?.source !== 'microphone' || widgetId === undefined
        ? null
        : {deviceId: settings.microphone?.deviceId ?? '', widgetId}
    },
    null,
    {equals: (first, second) => JSON.stringify(first) === JSON.stringify(second)},
  )
  createEffect(() => {
    const id = props.widgetId()
    if (id === undefined) {
      return
    }
    const publish = createMicrophonePublisher(id)
    let state: MicrophoneState = {level: 0, phase: 'off', widgetId: id}
    const update = (value: MicrophoneState) => {
      state = value
      publish(value)
    }
    let disposed = false
    let devices: readonly MicrophoneDevice[] = []
    const refreshDevices = async () => {
      try {
        const available = await readMicrophones()
        if (!disposed) {
          devices = available
          publish({...state, devices})
        }
      } catch (cause) {
        console.error('Microphone device discovery failed', cause)
      }
    }
    const media = globalThis.navigator?.mediaDevices
    media?.addEventListener?.('devicechange', refreshDevices)
    let unsubscribe: (() => void) | undefined
    subscribeMicrophoneRequests(id, (request) => {
      if (request.action === 'retry') {
        setRevision((value) => value + 1)
      } else {
        publish({...state, devices})
      }
    })
      .then((stop) => {
        if (disposed) {
          stop()
        } else {
          unsubscribe = stop
        }
      })
      .catch(console.error)
    createEffect(() => {
      const current = selection()
      revision()
      const emit = createLipSyncPublisher(id)
      if (current === null) {
        update({level: 0, phase: 'off', widgetId: id})
        return
      }
      const controller = new AbortController()
      const analyze = createMicrophoneAnalysis()
      let stop: (() => void) | undefined
      const failed = (cause: unknown) => {
        if (!controller.signal.aborted) {
          console.error('Microphone lip sync failed', cause)
          controller.abort()
          emit('microphone', 0)
          update({
            error: cause instanceof Error ? cause.message : '마이크 연결을 확인해 주세요.',
            level: 0,
            phase: 'error',
            widgetId: id,
          })
        }
      }
      update({level: 0, phase: 'starting', widgetId: id})
      startMicrophone({
        deviceId: current.deviceId,
        onError: failed,
        onFrame: (audio) => {
          if (controller.signal.aborted) {
            return
          }
          const threshold = untrack(
            () => props.settings()?.microphone?.threshold ?? DEFAULT_MICROPHONE_THRESHOLD,
          )
          const frame = analyze(audio, threshold)
          emit('microphone', frame.level, frame.shape, {weights: frame.weights})
          update({level: frame.inputLevel, phase: 'listening', widgetId: id})
        },
        signal: controller.signal,
      })
        .then((release) => {
          if (controller.signal.aborted) {
            release()
          } else {
            stop = release
            update({level: 0, phase: 'listening', widgetId: id})
            refreshDevices()
          }
        })
        .catch(failed)
      onCleanup(() => {
        controller.abort()
        stop?.()
        emit('microphone', 0)
        update({level: 0, phase: 'off', widgetId: id})
      })
    })
    onCleanup(() => {
      disposed = true
      unsubscribe?.()
      media?.removeEventListener?.('devicechange', refreshDevices)
    })
  })
}
