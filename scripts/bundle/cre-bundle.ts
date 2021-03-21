import {genRollupOptions, GenRollupOptions} from './gen-rollup-options'
import {creRollupBundle} from './cre-rollup-bundle'
import {watch} from 'gulp'

export type RollupOptions = GenRollupOptions

export const creBundle = (options?: RollupOptions) => creRollupBundle(
  genRollupOptions(options),
)

export const creWatchBundle = (options: RollupOptions = {}) => {
  const {src = 'src', cwd = process.cwd(), ...rest} = options

  console.log(cwd)

  const rollup = creRollupBundle(
    genRollupOptions({src, ...rest}),
  )

  return async () => {
    await rollup()

    return watch([`./${src}/**/*.ts`], rollup)
  }
}
