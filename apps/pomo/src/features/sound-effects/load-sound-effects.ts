import {isPlainObject} from 'es-toolkit/predicate'
import {isNonBlankString} from 'src/utils/is-non-blank-string'
import {createCatalogRequestInit, hasUniqueIds} from 'src/features/catalog-policy'
import {audioFetch, httpFetch} from '../http-client'
import type {SoundEffect} from './types'

export const SOUND_EFFECTS_URL = '/audio/sound-effects.json'

export interface LoadSoundEffectsOptions {
  readonly signal?: AbortSignal
  readonly url?: string
}

interface SoundEffectCollection {
  readonly effects: readonly SoundEffect[]
  readonly version: number
}

const hasSoundEffectTitle = (value: unknown): value is SoundEffect['title'] => {
  if (!isPlainObject(value)) {
    return false
  }

  const title = value
  return isNonBlankString(title.en) && isNonBlankString(title.ko)
}

const isSoundEffect = (value: unknown): value is SoundEffect => {
  if (!isPlainObject(value)) {
    return false
  }

  const effect = value
  return (
    isNonBlankString(effect.artworkUrl) &&
    typeof effect.durationSeconds === 'number' &&
    Number.isFinite(effect.durationSeconds) &&
    effect.durationSeconds > 0 &&
    isNonBlankString(effect.id) &&
    isNonBlankString(effect.source) &&
    hasSoundEffectTitle(effect.title)
  )
}

const isSoundEffectCollection = (value: unknown): value is SoundEffectCollection => {
  if (!isPlainObject(value)) {
    return false
  }

  const collection = value
  return (
    collection.version === 1 &&
    Array.isArray(collection.effects) &&
    collection.effects.every(isSoundEffect) &&
    hasUniqueIds(collection.effects.map((effect) => effect.id))
  )
}

const fetchDefaultSoundEffects = (signal?: AbortSignal): Promise<Response> => {
  const requestInit = createCatalogRequestInit(signal)

  // Desktop development serves public assets from Vite while the desktop client uses the
  // remote asset origin for packaged assets.
  if (import.meta.env.DEV && import.meta.env.VITE_POMO_IS_DESKTOP === 'true') {
    return globalThis.fetch(SOUND_EFFECTS_URL, requestInit)
  }

  return audioFetch('sound-effects.json', requestInit)
}

/** Loads and validates the public sound-effect catalog. */
export const loadSoundEffects = async (
  options: LoadSoundEffectsOptions = {},
): Promise<readonly SoundEffect[]> => {
  const response =
    options.url === undefined
      ? await fetchDefaultSoundEffects(options.signal)
      : await httpFetch(options.url, createCatalogRequestInit(options.signal))

  if (!response.ok) {
    throw new Error(`Sound effects request failed: ${response.status}`)
  }

  const collection: unknown = await response.json()
  if (!isSoundEffectCollection(collection)) {
    throw new TypeError('Sound effects have an invalid format')
  }

  return collection.effects
}
