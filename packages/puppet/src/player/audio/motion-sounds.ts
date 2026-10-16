import type {PuppetDocument} from '../document'
import type {MotionFrame} from '../playback/types'
import {createMotionSoundLoader, type MotionSoundError} from './motion-sound-loader'
import {getMotionSoundMouth, type MotionSoundMouth} from './motion-sound-mouth'
import {createMotionSoundOutput} from './motion-sound-output'

export interface CreateMotionSoundsOptions {
  /** Where motion sounds play; they only drive the mouth when omitted. */
  readonly destination?: AudioNode
  readonly onError?: (error: MotionSoundError) => void
}

export interface MotionSounds {
  load(document: Pick<PuppetDocument, 'motions'>): void
  /** The mouth the frames' sounds ask for; `undefined` while none is sounding. */
  mouth(frames: ReadonlyArray<MotionFrame>): MotionSoundMouth | undefined
  /** Keeps the audio output in step with the frames. */
  sync(frames: ReadonlyArray<MotionFrame>): void
  stop(): void
}

/** A player's motion sounds: loading, mouth analysis and audio output. */
export const createMotionSounds = (options: CreateMotionSoundsOptions = {}): MotionSounds => {
  const loader = createMotionSoundLoader({onError: options.onError})
  const output =
    options.destination === undefined ? undefined : createMotionSoundOutput(options.destination)
  return {
    load: (document) => loader.load(document),
    mouth: (frames) => getMotionSoundMouth(frames, loader.get),
    stop: () => output?.stop(),
    sync: (frames) => output?.sync(frames, loader.get),
  }
}
