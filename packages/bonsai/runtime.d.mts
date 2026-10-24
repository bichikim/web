// oxlint-disable eslint-js/camelcase -- Upstream API name.
export interface LoadingProgress {
  readonly component?: string
  readonly loaded?: number
  readonly total?: number
}
export interface LoadOptions {
  readonly onProgress: (progress: LoadingProgress) => void
}
export interface GenerateOptions {
  readonly callbackOnStepEnd: (pipeline: unknown, step: number) => void
  readonly guidanceScale: number
  readonly height: number
  readonly numInferenceSteps: number
  readonly prompt: string
  readonly seed: number
  readonly width: number
}
export declare class Flux2KleinPipeline {
  static from_pretrained(model: string, options: LoadOptions): Promise<Flux2KleinPipeline>
  generate(options: GenerateOptions): Promise<{toBlob: () => Blob}>
  destroy(): Promise<void>
}
