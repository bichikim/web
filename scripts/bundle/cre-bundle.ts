import {genRollupOptions, GenRollupOptions} from './gen-rollup-options'
import {creRollupBundle} from './cre-rollup-bundle'

export type RollupOptions = GenRollupOptions

export const creBundle = (options?: RollupOptions) => creRollupBundle(
  genRollupOptions(options),
)
