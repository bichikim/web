import type {PuppetSound} from './decode-wav'
import type {PuppetDocument} from '../document'
import type {MotionFrame} from '../playback/types'
import {createMotionSoundLoader, type MotionSoundError} from './motion-sound-loader'
import {getMotionSoundMouth, type MotionSoundMouth} from './motion-sound-mouth'
import {createMotionSoundOutput} from './motion-sound-output'

export interface CreateMotionSoundsOptions {
  /** Where motion sounds play; they only drive the mouth when omitted. */
  readonly destination?: AudioNode
  readonly onError?: (error: MotionSoundError) => void
  /** Called when decoded samples become available; omitted, no notification. */
  readonly onLoad?: () => void
}

export interface MotionSounds {
  snapshot(): ReadonlyMap<string, PuppetSound>
  load(document: Pick<PuppetDocument, 'motions'>): void
  /** The mouth the frames' sounds ask for; `undefined` while none is sounding. */
  mouth(frames: ReadonlyArray<MotionFrame>, deltaTime?: number): MotionSoundMouth | undefined
  /** Keeps the audio output in step with the frames. */
  sync(frames: ReadonlyArray<MotionFrame>): void
  stop(): void
}

/** A player's motion sounds: loading, mouth analysis and audio output. */
export const createMotionSounds = (options: CreateMotionSoundsOptions = {}): MotionSounds => {
  const loader = createMotionSoundLoader({onError: options.onError, onLoad: options.onLoad})
  const output =
    options.destination === undefined
      ? undefined
      : createMotionSoundOutput(options.destination, (src) =>
          options.onError?.({reason: 'playback-failed', src}),
        )
  return {
    load: (document) => loader.load(document),
    mouth: (frames, deltaTime) => getMotionSoundMouth(frames, loader.get, deltaTime),
    snapshot: loader.snapshot,
    stop: () => output?.stop(),
    sync: (frames) => output?.sync(frames, loader.get),
  }
}
