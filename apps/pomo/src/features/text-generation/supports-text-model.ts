import {supportsWebGpu} from './environment'
import {getTextModelImplementation, type TextModelId} from './model'

export interface TextModelSupportOptions {
  readonly modelId: TextModelId
  readonly webGpu?: boolean
}

/** Checks availability of the selected model's execution backend. */
export const supportsTextModel = (options: TextModelSupportOptions): boolean =>
  options.modelId === 'cloud' ||
  (getTextModelImplementation(options.modelId).architecture === 'lfm-2-gguf'
    ? typeof WebAssembly !== 'undefined'
    : (options.webGpu ?? supportsWebGpu()))
