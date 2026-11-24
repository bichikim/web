import {invoke} from '@tauri-apps/api/core'
import {
  decodeWorkerResponse,
  encodeWorkerValue,
  type NativePlayerBackend,
  type NativePlayerSurface,
  type NativePlayerSurfaceKind,
} from '@winter-love/puppet/native'
import {decodePlayback, encodePacket} from './packet'
import {createCoordinateReceiver} from './coordinates'

const encoder = new TextEncoder()

const loadTexture = async (source: string): Promise<Uint8Array<ArrayBuffer>> => {
  const separator = source.indexOf(',')
  if (source.startsWith('data:') && source.slice(0, separator).endsWith(';base64')) {
    return Uint8Array.fromBase64(source.slice(separator + 1))
  }
  const response = await fetch(source)
  if (!response.ok) {
    throw new Error('Cannot read native widget texture')
  }
  return new Uint8Array(await response.arrayBuffer())
}

const connect = (id: string): NativePlayerSurface => {
  const coordinates = createCoordinateReceiver()
  return {
    close() {
      invoke('close_widget_native', {id}).catch((cause: unknown) => {
        console.error('Cannot close native widget surface', cause)
      })
    },
    async playback(message, target) {
      const section = message.kind === 'initialize-section' ? message : undefined
      if (section !== undefined || message.kind === 'initialize') {
        coordinates.clear()
      }
      const bytes =
        section === undefined
          ? encoder.encode(JSON.stringify({...message, deferGeometry: true}, encodeWorkerValue))
          : new Uint8Array(await section.runtimeSection.arrayBuffer())
      const response = await invoke<ArrayBuffer>(
        'play_widget_native',
        encodePacket(
          {
            id,
            length: bytes.length,
            section: section?.id,
            target:
              target === undefined
                ? undefined
                : {
                    alpha:
                      target.alpha === undefined
                        ? undefined
                        : [target.alpha.width, target.alpha.height],
                    size: [target.width, target.height],
                    view: target.view,
                  },
          },
          [bytes],
        ),
      )
      return decodePlayback({
        bytes: response,
        ...(target === undefined ? {} : {applyCoordinates: coordinates.apply}),
        decode: decodeWorkerResponse,
        id,
        message,
      })
    },
    async present({alpha, display, frame, height, vertices, view, width}) {
      const response = await invoke<ArrayBuffer>(
        'present_widget_native',
        encodePacket(
          {
            alpha: alpha === undefined ? undefined : [alpha.width, alpha.height],
            display: display.length,
            frame,
            id,
            size: [width, height],
            view,
          },
          frame === undefined ? [display, vertices] : [display],
        ),
      )
      return new Uint8Array(response)
    },
    async readAlpha() {
      return new Uint8Array(await invoke<ArrayBuffer>('read_widget_native_alpha', {id}))
    },
    release: (frame) => invoke('release_widget_native', {frame, id}),
  }
}

export const createNativeWidgetBackend = async (): Promise<NativePlayerBackend | undefined> => {
  const kind = await invoke<NativePlayerSurfaceKind | null>('native_widget_backend')
  if (kind === null) {
    return undefined
  }
  return {
    kind,
    async open(resources) {
      const textures = await Promise.all(resources.textures.map(loadTexture))
      const id = await invoke<string>(
        'open_widget_native',
        encodePacket(
          {
            metadata: resources.metadata,
            size: [resources.width, resources.height],
            textures: textures.map((texture) => texture.length),
          },
          textures,
        ),
      )
      return connect(id)
    },
  }
}
