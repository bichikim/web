import type {ImageVariant} from './settings'

const MODEL_ROOTS: Record<ImageVariant, string> = {
  binary:
    'https://storage.pomofi.io/models/image-generation/prism-ml/bonsai-image-binary-4B-mlx-1bit/d1b3ac11a7f1ba61d84b277339daeeed4a98e0e2',
  ternary:
    'https://storage.pomofi.io/models/image-generation/prism-ml/bonsai-image-ternary-4B-mlx-2bit/2c24c81b934a658ba5590cf39088ba929985b4a8',
}

export const getImageModelRoot = (variant: ImageVariant): string => MODEL_ROOTS[variant]
