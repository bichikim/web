import type {PuppetDocument} from '../document'
import {decodeWav, type DecodeWavError, type PuppetSound} from './decode-wav'

/** A motion sound that could not be fetched or decoded. */
export interface MotionSoundError {
  readonly reason: DecodeWavError | 'fetch-failed' | 'playback-failed'
  readonly src: string
}

export interface MotionSoundLoader {
  /** The decoded sound, once loaded. */
  get(src: string): PuppetSound | undefined
  /**
   * Starts loading the document's motion sounds that are not loaded yet and drops sounds the
   * document no longer uses.
   */
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

/**
 * Loads each distinct motion sound once, in the background. A failed fetch is reported once and
 * retried on the next `load` that still uses the sound; an undecodable file is not retried.
 */
export const createMotionSoundLoader = (
  options: CreateMotionSoundLoaderOptions = {},
): MotionSoundLoader => {
  const sounds = new Map<string, PuppetSound>()
  /** The current attempt per used `src`; a settled attempt that is no longer current is ignored. */
  const requested = new Map<string, object>()
  const read = options.fetchBytes ?? fetchBytes
  const request = async (src: string, attempt: object) => {
    let bytes: ArrayBuffer
    try {
      bytes = await read(src)
    } catch {
      if (requested.get(src) === attempt) {
        // Forgetting the attempt lets the next `load` retry a temporary failure.
        requested.delete(src)
        options.onError?.({reason: 'fetch-failed', src})
      }
      return
    }
    // The document dropped this sound while it loaded.
    if (requested.get(src) !== attempt) {
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
      const used = new Set(document.motions.flatMap((motion) => motion.sound?.src ?? []))
      for (const src of requested.keys()) {
        if (!used.has(src)) {
          requested.delete(src)
          sounds.delete(src)
        }
      }
      for (const src of used) {
        if (!requested.has(src)) {
          const attempt = {}
          requested.set(src, attempt)
          request(src, attempt).catch(() => undefined)
        }
      }
    },
  }
}
