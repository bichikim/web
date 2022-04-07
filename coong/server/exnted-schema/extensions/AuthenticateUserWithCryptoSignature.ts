import {BaseSchemaMeta, Extension} from '@graphql-ts/extend'
import {graphql} from '@keystone-6/core'
import bs58 from 'bs58'
import {ExtendContext} from 'exnted-schema/types'
import {camelCase} from 'lodash'
import {sign} from 'tweetnacl'
import {AUTH_LIST_KEY} from '../../auth'

interface SignInWithSolanaResultType {
  item: any
  sessionToken: string
}

export const authenticateUserWithCryptoSignature = (base: BaseSchemaMeta, extendContext: ExtendContext): Extension => {

  const result = graphql.object<SignInWithSolanaResultType>()({
    fields: {
      item: graphql.field({type: base.object(AUTH_LIST_KEY)}),
      sessionToken: graphql.field({type: graphql.String}),
    },
    name: 'AuthenticateUserWithCryptoSignatureResult',
  })

  const input = graphql.inputObject({
    fields: {
      message: graphql.arg({type: graphql.nonNull(graphql.String)}),
      publicKey: graphql.arg({type: graphql.nonNull(graphql.String)}),
      signature: graphql.arg({type: graphql.nonNull(graphql.String)}),
    },
    name: 'AuthenticateUserWithCryptoSignatureInput',
  })

  return {
    mutation: {
      authenticateUserWithCryptoSignature: graphql.field({
        args: {
          input: graphql.arg({type: graphql.nonNull(input)}),
        },
        async resolve(
          root,
          args,
          context,
        ) {
          const {jwt, blockchain} = extendContext
          const {message, publicKey, signature} = args.input
          // todo nonceToken 을 JWT 검증하고 jwt 에 있는 nonce 와 input 에 있는 nonce 가 같은지 확인
          const nonceToken = blockchain.pickNonce(message)
          const messageBytes = new TextEncoder().encode(message)
          const publicKeyBytes = bs58.decode(publicKey)
          const signatureBytes = bs58.decode(signature)
          const jwtValidated = await jwt.verify(nonceToken)

          const validated = sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)

          if (!validated || typeof jwtValidated !== 'object') {
            return null
          }
          const {email} = jwtValidated as any
          if (!email) {
            return null
          }

          const result = await context.prisma[camelCase(AUTH_LIST_KEY)]?.findFirst({
            where: {email},
          })

          if (!result) {
            return null
          }

          const sessionToken: string | undefined = await context.startSession?.({
            itemId: result.id.toString(),
            listKey: AUTH_LIST_KEY,
          })

          if (!sessionToken) {
            return null
          }

          return {
            item: result,
            sessionToken,
          }
        },
        type: result,
      }),
    },
  }
}
