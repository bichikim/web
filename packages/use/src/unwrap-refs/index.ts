import {flow} from 'lodash'
import {unref} from 'vue'

export const unWrapRefs = flow(
  (record) => Object.keys(record).map((key) => {
    const value = record[key]
    return [key, unref(value)]
  }),
  (entries) => Object.fromEntries(entries),
)
