import type {PuppetDocument} from '../document'
import {decodeWav, type DecodeWavError, type PuppetSound} from './decode-wav'

/** A motion sound that could not be fetched or decoded. */
export interface MotionSoundError {
  readonly reason: DecodeWavError | 'fetch-failed'
  readonly src: string
}

export interface MotionSoundLoader {
  /** The decoded sound, once loaded. */
  get(src: string): PuppetSound | undefined
  /** Starts loading the document's motion sounds that are not loaded yet. */
  load(document: Pick<PuppetDocument, 'motions'>): void
}

export interface CreateMotionSoundLoaderOptions {
  /** Reads a `src` (a data URL or a URL relative to the page); `fetch` when omitted. */
  readonly fetchBytes?: (src: string) => Promise<ArrayBuffer>
  readonly onError?: (error: MotionSoundError) => void
}

const fetchBytes = async (src: string) => {
  const response = await fetch(src)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${src}: ${response.status}`)
  }
  return response.arrayBuffer()
}

/** Loads each distinct motion sound once, in the background. */
export const createMotionSoundLoader = (
  options: CreateMotionSoundLoaderOptions = {},
): MotionSoundLoader => {
  const sounds = new Map<string, PuppetSound>()
  const requested = new Set<string>()
  const read = options.fetchBytes ?? fetchBytes
  const request = async (src: string) => {
    let bytes: ArrayBuffer
    try {
      bytes = await read(src)
    } catch {
      options.onError?.({reason: 'fetch-failed', src})
      return
    }
    const decoded = decodeWav(bytes)
    if (decoded.ok) {
      sounds.set(src, decoded.sound)
    } else {
      options.onError?.({reason: decoded.error, src})
    }
  }
  return {
    get: (src) => sounds.get(src),
    load(document) {
      for (const motion of document.motions) {
        const src = motion.sound?.src
        if (src !== undefined && !requested.has(src)) {
          requested.add(src)
          request(src).catch(() => undefined)
        }
      }
    },
  }
}
