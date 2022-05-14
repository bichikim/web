import crypto from 'crypto'
import {Extension} from '@graphql-ts/extend'
import {graphql} from '@keystone-6/core'
import {ExtendContext} from '../types'

const SIZE = 32

export const authenticateCryptoSignMessage = (_, extendContext: ExtendContext): Extension => {

  const input = graphql.inputObject({
    fields: {
      email: graphql.arg({type: graphql.nonNull(graphql.String)}),
    },
    name: 'AuthenticateCryptoSignMessageInput',
  })

  return {
    query: {
      authenticateCryptoSignMessage: graphql.field({
        args: {
          input: graphql.arg({type: graphql.nonNull(input)}),
        },
        async resolve(
          root,
          args,
        ) {
          const {jwt, blockchain} = extendContext
          const {email} = args.input
          // email 유저가 있는지 검사하지 않는다 유저가 없다면 로그인
          const nonce: string = crypto.randomBytes(SIZE).toString('base64')
          const nonceJwt = await jwt.sign({email, nonce})
          if (!nonceJwt) {
            return
          }
          return blockchain.generateMessage(nonceJwt)
        },
        type: graphql.String,
      }),
    },
  }
}
