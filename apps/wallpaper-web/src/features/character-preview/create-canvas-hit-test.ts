import type {CharacterHitTest} from './types'

interface CreateCanvasHitTestOptions {
  /** 투명 배경으로 캐릭터를 그리는 캔버스. */
  readonly canvas: HTMLCanvasElement
  /** WebGL 버퍼가 지워지기 전에 현재 포즈를 동기적으로 다시 그린다. */
  readonly redraw: () => void
}

export const createCanvasHitTest = (options: CreateCanvasHitTestOptions): CharacterHitTest => {
  const sample = options.canvas.ownerDocument.createElement('canvas')
  sample.width = 1
  sample.height = 1
  let context: CanvasRenderingContext2D | null | undefined
  let failed = false
  return (point) => {
    const bounds = options.canvas.getBoundingClientRect()
    const x = (point.clientX - bounds.left) / bounds.width
    const y = (point.clientY - bounds.top) / bounds.height
    if (failed || !(x >= 0 && x < 1 && y >= 0 && y < 1)) {
      return false
    }
    try {
      if (context === undefined) {
        context = sample.getContext('2d', {willReadFrequently: true})
      }
      if (context === null) {
        return false
      }
      options.redraw()
      context.clearRect(0, 0, 1, 1)
      context.drawImage(
        options.canvas,
        Math.floor(x * options.canvas.width),
        Math.floor(y * options.canvas.height),
        1,
        1,
        0,
        0,
        1,
        1,
      )
      return context.getImageData(0, 0, 1, 1).data[3]! > 0
    } catch (cause) {
      failed = true
      console.warn('Character hit test unavailable', cause)
      return false
    }
  }
}
