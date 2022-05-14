import WebAuth from '@webauthn-lib/server'
import {RegistrationChallenge, RpEntity, UserEntity} from '@webauthn-lib/server/dist/typed/webauthn'
import {BaseSchemaMeta, Extension} from '@graphql-ts/extend'
import {graphql} from '@keystone-6/core'
import {AUTH_LIST_KEY} from '#auth'
import {ExtendContext} from '../types'
import {camelCase} from 'lodash'

export const webAuthChallenge = (base: BaseSchemaMeta, extendContext: ExtendContext): Extension => {

  const RpEntity = graphql.object<RpEntity>()({
    fields: {
      id: graphql.field({type: graphql.String}),
      name: graphql.field({type: graphql.nonNull(graphql.String)}),
    },
    name: 'RpEntity',
  })

  const UserEntity = graphql.object<UserEntity>()({
    fields: {
      displayName: graphql.field({type: graphql.String}),
      id: graphql.field({type: graphql.nonNull(graphql.String)}),
      name: graphql.field({type: graphql.nonNull(graphql.String)}),
    },
    name: 'UserEntity',
  })

  const WebAuthChallengeResult = graphql.object<RegistrationChallenge>()({
    fields: {
      challenge: graphql.field({type: graphql.nonNull(graphql.String)}),
      rp: graphql.field({
        type: graphql.nonNull(RpEntity),
      }),
      user: graphql.field({
        type: graphql.nonNull(UserEntity),
      }),
    },
    name: 'WebAuthChallengeResult',
  })

  const input = graphql.inputObject({
    fields: {
      email: graphql.arg({type: graphql.nonNull(graphql.String)}),
    },
    name: 'WebAuthChallengeInput',
  })

  return {
    query: {
      webAuthChallenge: graphql.field({
        args: {
          input: graphql.arg({type: graphql.nonNull(input)}),
        },
        async resolve(
          root,
          args,
          context,
        ) {
          const {webAuth} = extendContext
          const user = await context.prisma[camelCase(AUTH_LIST_KEY)]?.findFirst({
            where: {email: args.input.email},
          })

          // const result: RegistrationChallenge = {
          //   challenge: '--',
          //   pubKeyCredParams: [],
          //   rp: {
          //     name: 'foo',
          //   },
          //   user: {
          //     id: 'foo',
          //     name: 'foo',
          //   },
          // }
          // return result
          // todo return challenge with jwt token
          if (!user) {
            return null
          }

          return webAuth.newRegister({
            user: {
              id: WebAuth.generateId(),
              name: user.name,
            },
          })
        },
        type: WebAuthChallengeResult,
      }),
    },
  }
}
