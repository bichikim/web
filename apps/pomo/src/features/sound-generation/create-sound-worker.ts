import type {SoundWorker} from './types'
/** Creates the module Worker implementing the sound-generation message contract. */
export const createSoundWorker = (): SoundWorker =>
  new Worker(new URL('./worker.ts', import.meta.url), {type: 'module'})
