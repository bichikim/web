import {graphql} from '@keystone-6/core'
import * as extensions from './extensions'

export const extendGraphqlSchema = graphql.extend((base) => {
  return Object.keys(extensions).map((key) => {
    // eslint-disable-next-line import/namespace
    const extension = extensions[key]
    if (typeof extension === 'function') {
      return extension(base)
    }
    return extension
  })
})
