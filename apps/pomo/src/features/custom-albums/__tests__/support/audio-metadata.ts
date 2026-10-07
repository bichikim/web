import {vi} from 'vitest'

const DEFAULT_DURATION_SECONDS = 60

export interface AudioMetadataOptions {
  readonly durationSeconds?: number
  readonly deferLoad?: boolean
}

export const stubCustomAlbumAudioMetadata = (options: AudioMetadataOptions = {}) => {
  const audio = Object.assign(new EventTarget(), {
    delivered: vi.fn(),
    duration: options.durationSeconds ?? DEFAULT_DURATION_SECONDS,
    load: vi.fn(),
    preload: '',
    removeAttribute: vi.fn(),
    src: '',
  })
  const listeners = new Map<EventListenerOrEventListenerObject, EventListener>()
  const addListener = audio.addEventListener.bind(audio)
  const removeListener = audio.removeEventListener.bind(audio)
  vi.spyOn(audio, 'addEventListener').mockImplementation((event, listener, settings) => {
    if (listener === null) {
      return
    }
    const wrapped: EventListener = (notification) => {
      audio.delivered(notification.type)
      if (typeof listener === 'function') {
        listener.call(audio, notification)
      } else {
        listener.handleEvent(notification)
      }
    }
    listeners.set(listener, wrapped)
    addListener(event, wrapped, settings)
  })
  vi.spyOn(audio, 'removeEventListener').mockImplementation((event, listener, settings) => {
    if (listener !== null) {
      removeListener(event, listeners.get(listener) ?? listener, settings)
      listeners.delete(listener)
    }
  })
  const loaded = () => audio.dispatchEvent(new Event('loadedmetadata'))
  audio.load.mockImplementation(() =>
    options.deferLoad === true ? queueMicrotask(loaded) : loaded(),
  )
  vi.stubGlobal('document', {
    createElement: (tagName: string) => {
      if (tagName !== 'audio') {
        throw new Error(`Unexpected element: ${tagName}`)
      }
      return audio
    },
  })
  vi.spyOn(globalThis.URL, 'createObjectURL').mockReturnValue('blob:audio')
  vi.spyOn(globalThis.URL, 'revokeObjectURL').mockImplementation(() => undefined)
  return audio
}
