import {unwrapRef} from '../unwrap-ref'
import {flow} from 'lodash'

export const unWrapRefs = flow(
  (record) => Object.keys(record).map((key) => {
    const value = record[key]
    return [key, unwrapRef(value)]
  }),
  (entries) => Object.fromEntries(entries),
)
