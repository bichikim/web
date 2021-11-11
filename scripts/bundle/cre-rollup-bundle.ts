import {OutputOptions, rollup, RollupOptions} from 'rollup'
import {defaultsDeep} from 'lodash'

export const defInputConfig: RollupOptions = {
  input: 'src/index.ts',
}

export const defOutputOptions: OutputOptions[] = []

export interface BundleOptions {
  input?: RollupOptions
  output?: OutputOptions[]
}

type PickRequired<Record, Keys extends keyof Record> = {
  [Props in Keys]-?: Record[Props]
} & {
  [Props in Exclude<keyof Record, Keys>]: Record[Props]
}

export const creRollupBundle = (options: BundleOptions = {}) => {
  const inputOptions: PickRequired<RollupOptions, 'input'> = defaultsDeep(options.input, defInputConfig)
  const outputOptionsList: OutputOptions[] = options.output ?? defOutputOptions

  return () => rollup({
    ...inputOptions,
  }).then((bundle) => {
    return Promise.all(outputOptionsList.map((options) => {
      return bundle.write({...options})
    }))
  })
}
