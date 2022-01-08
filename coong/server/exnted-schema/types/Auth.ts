import {arg, extendType, inputObjectType, nonNull, objectType} from 'nexus'

export const SignUpResult = objectType({
  definition(type) {
    type.string('id')
    type.string('name')
    type.string('email')
  },
  name: 'SignUpResult',
})

export const SignUpInput = inputObjectType({
  definition(type) {
    type.string('name')
    type.string('email')
    type.string('password')
  },
  description: 'Sign up input data',
  name: 'SignUpInput',
})

export const SignUp = extendType({
  definition(type) {
    type.field('signUp', {
      args: {
        input: nonNull(arg({
          type: SignUpInput,
        })),
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
      type: SignUpResult,
    })
  },
  type: 'Mutation',
})
