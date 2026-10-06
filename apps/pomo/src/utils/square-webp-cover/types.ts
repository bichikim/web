export interface SquareWebpCanvas {
  width: number
  height: number
  readonly getContext: (
    contextId: '2d',
    options?: CanvasRenderingContext2DSettings,
  ) => Pick<CanvasRenderingContext2D, 'drawImage'> | null
  readonly toBlob: HTMLCanvasElement['toBlob']
}
