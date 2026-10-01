import type {SquareWebpCanvas} from './types'
/** Creates the browser Canvas used to draw and encode square WebP covers. */
export const createSquareWebpCanvas = (): SquareWebpCanvas => document.createElement('canvas')
