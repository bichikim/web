import {BaseSchemaMeta, Extension} from '@graphql-ts/extend'
import {graphql} from '@keystone-6/core'
import {camelCase} from 'lodash'
import {AUTH_LIST_KEY} from '../../auth'
import bs58 from 'bs58'
import {sign} from 'tweetnacl'

interface SignInWithSolanaResultType {
  item: any
  sessionToken: string
}

const getMessage = (nonce: string) => {
  return `Sign In the Coong Site via your solana wallet for ${nonce}`
}

const getPublicKey = (kind: string, publicKey: string) => {
  return `${kind}:${publicKey}`
}

export const authenticateUserWithBlockchainWallet = (base: BaseSchemaMeta): Extension => {

  const result = graphql.object<SignInWithSolanaResultType>()({
    fields: {
      item: graphql.field({type: base.object(AUTH_LIST_KEY)}),
      sessionToken: graphql.field({type: graphql.String}),
    },
    name: 'AuthenticateUserWithSolanaResult',
  })

  const input = graphql.inputObject({
    fields: {
      nonce: graphql.arg({type: graphql.nonNull(graphql.String)}),
      nonceToken: graphql.arg({type: graphql.nonNull(graphql.String)}),
      publicKey: graphql.arg({type: graphql.nonNull(graphql.String)}),
      signature: graphql.arg({type: graphql.nonNull(graphql.String)}),
    },
    name: 'AuthenticateUserWithBlockchainWalletInput',
  })

  return {
    mutation: {
      authenticateUserWithBlockchainWallet: graphql.field({
        args: {
          input: graphql.arg({type: graphql.nonNull(input)}),
        },
        async resolve(
          root,
          args,
          context,
        ) {
          const {nonce, publicKey, signature} = args.input
          // todo nonceToken 을 JWT 검증하고 jwt 에 있는 nonce 와 input 에 있는 nonce 가 같은지 확인
          const message = getMessage(nonce)
          const messageBytes = new TextEncoder().encode(message)
          const publicKeyBytes = bs58.decode(publicKey)
          const signatureBytes = bs58.decode(signature)
          const validated = sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)

          if (!validated) {
            return null
          }

          // todo jwt 에 있는 email 로 찾는 것으로 변경 (없다면 bye bye)
          const result = await context.prisma[camelCase(AUTH_LIST_KEY)]?.findFirst({
            where: {publicKey: getPublicKey('solana', publicKey)},
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
