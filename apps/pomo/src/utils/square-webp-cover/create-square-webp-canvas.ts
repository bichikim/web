import type {SquareWebpCanvas} from './types'
/** 정사각형 WebP 커버를 그리고 인코딩할 브라우저 Canvas를 만든다. */
export const createSquareWebpCanvas = (): SquareWebpCanvas => document.createElement('canvas')
