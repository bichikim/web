import {cosineEaseInOut} from 'src/utils/cosine-ease-in-out'

export const cosineEaseOutAlpha = (elapsed: number, duration: number): number =>
  1 - cosineEaseInOut(elapsed / duration)
