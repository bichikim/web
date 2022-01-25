import {Extension} from '@graphql-ts/extend'
import {graphql} from '@keystone-6/core'

interface SignUpResultType {
  email: string
  id: string
  name: string
}

export const CreateAuthenticateUserWithEmail = (): Extension => {
  const CreateAuthenticateUserWithEmailResult = graphql.object<SignUpResultType>()({
    fields: {
      email: graphql.field({type: graphql.String}),
      id: graphql.field({type: graphql.String}),
      name: graphql.field({type: graphql.String}),
    },
    name: 'CreateAuthenticateUserWithEmailResult',
  })

  const CreateAuthenticateUserWithEmail = graphql.inputObject({
    fields: {
      email: graphql.arg({type: graphql.String}),
      name: graphql.arg({type: graphql.String}),
      password: graphql.arg({type: graphql.String}),
    },
    name: 'CreateAuthenticateUserWithEmailInput',
  })

  return {
    mutation: {
      createAuthenticateUserWithEmail: graphql.field({
        args: {
          input: graphql.arg({type: CreateAuthenticateUserWithEmail}),
        },
        async resolve(root, args, context) {
          const {password, name, email} = args.input ?? {}
          if (!password || !name || !email) {
            return null
          }
          return context.prisma.user.create({
            data: {
              email,
              name,
              password,
            },
          })
        },
        type: CreateAuthenticateUserWithEmailResult,
      }),
    },
  }
}
