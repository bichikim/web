import crypto from 'crypto'
import {Extension} from '@graphql-ts/extend'
import {graphql} from '@graphql-ts/schema'

const SIZE = 32

interface GetSignInNonceResultType {
  nonce: string
}

export const authenticateUserNonce = (): Extension => {

  const GetAuthenticateUserNonceResultType = graphql.object<GetSignInNonceResultType>()({
    fields: {
      nonce: graphql.field({type: graphql.String}),
    },
    name: 'GetAuthenticateUserNonceResultType',
  })

  return {
    query: {
      authenticateUserNonce: graphql.field({
        resolve() {
          const nonce: string = crypto.randomBytes(SIZE).toString('base64')
          return {
            nonce,
          }
        },
        type: GetAuthenticateUserNonceResultType,
      }),
    },
  }
}
