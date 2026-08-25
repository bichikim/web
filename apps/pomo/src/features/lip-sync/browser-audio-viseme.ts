import type {WLipSyncAudioNode} from 'wlipsync'

import type {PViseme} from './index'

export interface PBrowserAudioVisemeFrame {
  readonly intensity: number
  readonly viseme: PViseme
}

export interface PBrowserAudioVisemeAnalyzer {
  readonly connect: (source: AudioNode) => Promise<void>
  readonly disconnect: (source: AudioNode) => void
  readonly dispose: () => void
  readonly getFrame: (fallbackViseme: PViseme) => PBrowserAudioVisemeFrame | null
}

export interface ResolvePBrowserAudioVisemeFrameOptions {
  readonly fallbackViseme: PViseme
  readonly intensity: number
  readonly weights: Readonly<Record<string, number>>
}

const PROFILE_BASE64 = [
  'V0xJUAAAPoAAAAQAHgIMDABCx9elwC/sS8KAc8LBzBdwQMb/e0F2e9jB8VJ3QB2EocEUiUXASj2IwUKBW8HFGzNBf2AhQkPf',
  'EUJlCvXCBc/iwYiPx8E7g1PCIr87wVav5cCVZu3BKvkrQQM7Yr+/nwhCyKsJQhs+sEHNFtBBqLbHwXGwkcIaUfrCGCqVv3yT',
  'Y8BBxKjALsPLwKiQdECZfNVCZ0c5QRRYyEJFftVA23uVwljUecGB6krBzrlYQKuswcEDjujAWmCjQTD0XL9q5bNC1Hl/QlsQ',
  'QT+tSTzB9GE3wgr3p8GFG5nBUq25v3XtK79jUOXBAEhvwBDHhcD5wO3CvmcrQVdHE8E8ENNAl/zoQJN7CcBMXDtA5FfcwR52',
  'K0Ee37/AOlLPQGtYvEAJ458/hl1swpFJy8GrQFPCG6fMQi/qQMF3QT3CKIsaQckGHMGG3sLBdg1nwH6Jn8BMmgTCCUSPQVtF',
  'MUI4IMXCoDsSwD/mwMGfRiTBmg4Iv/xrM8CBhn7A6d3jwbyfm0GQdtdCC+pBwW7ql0GSI1XCFwlyv69EiMIjOqzBpgR3wKku',
  'd8D5MX9Am/UMwgENkkDufUBCWQFEwU5Z1UH26lDBOwg8wbrwmcIH/FbBix0AwR+GOsFAH2zBHLX0wblmpMET0JhBBqgQwhP4',
  'QUI2mjzCOR0gwUTWEL+hSzlAcuNUP41WW8HM20PBr11NwXzuXcGFJ8BCXHpTwY0vqcHTI6PCkYDtv5SSuD/pUtjCCk2FQaSx',
  '7sFL6qPBG9HnQTQF2cCPX5AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/gAAAP4AA',
  'AD+AAAA/gAAAP4AAAD+AAAA/gAAAP4AAAD+AAAA/gAAAP4AAAD+AAAABQQFJAVUBRQFPAVMBQQFJAVUBVQFFAU8=',
].join('')
const ANALYSIS_VOLUME_THRESHOLD = 0.08
const CLOSED_VOLUME_THRESHOLD = 0.28
const AUDIO_OVERRIDE_MINIMUM_WEIGHT = 0.8
const AUDIO_OVERRIDE_MINIMUM_MARGIN = 0.35
const VISEME_BY_PROFILE_NAME = {
  A: 'open',
  E: 'wide',
  I: 'wide',
  O: 'round',
  S: 'narrow',
  U: 'round',
} as const satisfies Readonly<Record<string, PViseme>>

const decodeProfile = () => {
  const binary = atob(PROFILE_BASE64)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return bytes.buffer
}

const getDominantProfile = (weights: Readonly<Record<string, number>>) => {
  let dominantName: keyof typeof VISEME_BY_PROFILE_NAME | null = null
  let dominantWeight = Number.NEGATIVE_INFINITY

  for (const name of Object.keys(VISEME_BY_PROFILE_NAME) as Array<
    keyof typeof VISEME_BY_PROFILE_NAME
  >) {
    const weight = weights[name] ?? 0

    if (weight > dominantWeight) {
      dominantName = name
      dominantWeight = weight
    }
  }

  return dominantName === null || dominantWeight <= 0
    ? null
    : {name: dominantName, weight: dominantWeight}
}

const getVisemeWeight = (weights: Readonly<Record<string, number>>, viseme: PViseme) => {
  let visemeWeight = 0

  for (const [name, profileViseme] of Object.entries(VISEME_BY_PROFILE_NAME)) {
    if (profileViseme === viseme) {
      visemeWeight = Math.max(visemeWeight, weights[name] ?? 0)
    }
  }

  return visemeWeight
}

/** Maps language-independent MFCC profile weights to Pomo's mouth sprites. */
export const resolvePBrowserAudioVisemeFrame = (
  options: ResolvePBrowserAudioVisemeFrameOptions,
): PBrowserAudioVisemeFrame => {
  const {fallbackViseme, intensity, weights} = options

  if (fallbackViseme === 'closed') {
    return {
      intensity: Math.max(Math.min(intensity, CLOSED_VOLUME_THRESHOLD), ANALYSIS_VOLUME_THRESHOLD),
      viseme: 'closed',
    }
  }

  if (intensity < ANALYSIS_VOLUME_THRESHOLD) {
    return {intensity, viseme: 'rest'}
  }

  const dominantProfile = getDominantProfile(weights)

  if (dominantProfile === null) {
    return {intensity, viseme: fallbackViseme === 'rest' ? 'narrow' : fallbackViseme}
  }

  const dominantViseme = VISEME_BY_PROFILE_NAME[dominantProfile.name]

  if (fallbackViseme !== 'rest' && dominantViseme !== fallbackViseme) {
    const fallbackWeight = getVisemeWeight(weights, fallbackViseme)
    const hasStrongAudioOverride =
      dominantProfile.weight >= AUDIO_OVERRIDE_MINIMUM_WEIGHT &&
      dominantProfile.weight - fallbackWeight >= AUDIO_OVERRIDE_MINIMUM_MARGIN

    if (!hasStrongAudioOverride) {
      return {intensity, viseme: fallbackViseme}
    }
  }

  return {
    intensity,
    viseme: dominantViseme,
  }
}

const createNode = async (context: AudioContext) => {
  if (typeof AudioWorkletNode === 'undefined' || context.audioWorklet === undefined) {
    return null
  }

  try {
    const {createWLipSyncNode, parseBinaryProfile} = await import('wlipsync')
    const node = await createWLipSyncNode(context, parseBinaryProfile(decodeProfile()))
    node.minVolume = -2.8
    node.maxVolume = -1.35
    node.smoothness = 0.04
    return node
  } catch {
    return null
  }
}

/** Analyzes playback inside Web Audio without sending PCM outside the browser. */
export const createPBrowserAudioVisemeAnalyzer = (
  context: AudioContext,
): PBrowserAudioVisemeAnalyzer => {
  let isDisposed = false
  let isDestinationConnected = false
  let node: WLipSyncAudioNode | null = null
  const connectedSources = new Set<AudioNode>()
  const disconnectedSources = new WeakSet<AudioNode>()
  const nodePromise = createNode(context).then((createdNode) => {
    if (isDisposed) {
      createdNode?.disconnect()
      return null
    }

    node = createdNode
    return createdNode
  })

  const connect = async (source: AudioNode) => {
    const currentNode = await nodePromise

    if (
      isDisposed ||
      currentNode === null ||
      disconnectedSources.has(source) ||
      connectedSources.has(source)
    ) {
      return
    }

    source.connect(currentNode)
    connectedSources.add(source)

    if (!isDestinationConnected) {
      currentNode.connect(context.destination)
      isDestinationConnected = true
    }
  }

  const disconnect = (source: AudioNode) => {
    disconnectedSources.add(source)

    if (node !== null && connectedSources.has(source)) {
      source.disconnect(node)
      connectedSources.delete(source)

      if (connectedSources.size === 0 && isDestinationConnected) {
        node.disconnect(context.destination)
        isDestinationConnected = false
      }
    }
  }

  const getFrame = (fallbackViseme: PViseme): PBrowserAudioVisemeFrame | null => {
    if (node === null) {
      return null
    }

    return resolvePBrowserAudioVisemeFrame({
      fallbackViseme,
      intensity: node.volume,
      weights: node.weights,
    })
  }

  const dispose = () => {
    isDisposed = true
    node?.disconnect()
    node = null
    connectedSources.clear()
    isDestinationConnected = false
  }

  return {connect, disconnect, dispose, getFrame}
}
