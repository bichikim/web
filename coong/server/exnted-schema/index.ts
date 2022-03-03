import {graphql} from '@keystone-6/core'
import * as extensions from './extensions'
import {ExtendContext} from './types'
import WebAuth from '@webauthn-lib/server'

export const extendGraphqlSchema = graphql.extend((base) => {
  const context: ExtendContext = {
    webAuth: new WebAuth({
      rpOrigin: 'https://coong.io',
    }),
  }
  return Object.keys(extensions).map((key) => {
    // eslint-disable-next-line import/namespace
    const extension = extensions[key]
    if (typeof extension === 'function') {
      return extension(base, context)
    }
    return extension
  })
})
