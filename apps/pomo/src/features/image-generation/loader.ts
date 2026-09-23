import {getUnboundedPercentage} from '../progress'
import {getImageModelRoot} from './model'
import type {GenerationProgress} from './messages'
import type {ImageVariant} from './settings'

export interface LoadImageModelOptions {
  readonly variant: ImageVariant
  readonly onProgress: (progress: GenerationProgress) => void
}

export const loadImageModel = async (options: LoadImageModelOptions) => {
  const {Flux2KleinPipeline} = await import('@winter-love/bonsai')
  return Flux2KleinPipeline.from_pretrained(getImageModelRoot(options.variant), {
    onProgress: (progress) =>
      options.onProgress({
        label: '이미지 모델을 준비하고 있어요',
        ...(progress.total === undefined || progress.loaded === undefined || progress.total === 0
          ? {}
          : {percentage: getUnboundedPercentage(progress.loaded, progress.total)}),
        type: 'progress',
      }),
  })
}
