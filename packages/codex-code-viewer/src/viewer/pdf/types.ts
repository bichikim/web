import type {TextMatch} from '../find-text'

export interface PdfText {
  readonly source: string
  readonly offsets: readonly TextMatch[]
}
export interface PdfRender {
  readonly result: Promise<void>
  readonly cancel: () => void
}
export interface PdfPage {
  readonly text: () => Promise<PdfPageText>
  readonly width: number
  readonly height: number
  readonly render: (canvas: HTMLCanvasElement, scale: number, ratio: number) => PdfRender
}
export interface PdfDocument {
  readonly pages: number
  readonly text: (number: number) => Promise<string>
  readonly page: (number: number) => Promise<PdfPage>
}
export interface PdfLoad {
  readonly result: Promise<PdfDocument>
  readonly destroy: () => void
}
export interface PdfTextRun {
  readonly angle: number
  readonly direction: 'ltr' | 'rtl'
  readonly font: string
  readonly height: number
  readonly lineBreak: boolean
  readonly offset: number
  readonly text: string
  readonly width: number
  readonly x: number
  readonly y: number
}
export interface PdfPageText extends PdfText {
  readonly runs: readonly PdfTextRun[]
}
