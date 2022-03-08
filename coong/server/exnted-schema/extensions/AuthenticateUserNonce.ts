import crypto from 'crypto'
import {Extension} from '@graphql-ts/extend'
import {graphql} from '@graphql-ts/schema'
import {ExtendContext} from '../types'

const SIZE = 32

interface GetSignInNonceResultType {
  nonceToken: string
}

export const authenticateUserNonce = (_, extendContext: ExtendContext): Extension => {

  const input = graphql.inputObject({
    fields: {
      email: graphql.arg({type: graphql.nonNull(graphql.String)}),
    },
    name: 'AuthenticateUserNonceInput',
  })

  const result = graphql.object<GetSignInNonceResultType>()({
    fields: {
      nonceToken: graphql.field({type: graphql.String}),
    },
    name: 'AuthenticateUserNonceResult',
  })

  return {
    query: {
      authenticateUserNonce: graphql.field({
        args: {
          input: graphql.arg({type: graphql.nonNull(input)}),
        },
        resolve(
          root,
          args,
        ) {
          const {jwt} = extendContext
          const {email} = args.input
          // email 유저가 있는지 검사하지 않는다 유저가 없다면 로그인
          const nonce: string = crypto.randomBytes(SIZE).toString('base64')
          return {
            nonceToken: jwt.sign({email, nonce}),
          }
        },
        type: result,
      }),
    },
  }
}
