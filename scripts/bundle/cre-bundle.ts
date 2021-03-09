import {genRollupOptions, GenRollupOptions} from './gen-rollup-options'
import {creRollupBundle} from './cre-rollup-bundle'

export const creBundle = (options?: GenRollupOptions) => creRollupBundle(
  genRollupOptions(options),
)
