import {User} from 'src/generated/type-graphql/models/User'
import {Arg, Ctx, Mutation, Resolver} from 'type-graphql'
import {Context} from 'src/context'
import {SignInInput, SignUpInput} from './args'

@Resolver(() => User)
export class AuthResolver {
  @Mutation(() => User, {nullable: true})
  async signIn(@Ctx() {prisma, comparePassword}: Context, @Arg('data') data: SignInInput) {

    const {email, password} = data

    const user = await prisma.user.findUnique({
      where: {email},
    })

    if (user === null) {
      return user
    }

    const userPassword = user.password

    if (userPassword === null) {
      return null
    }

    if (await comparePassword(password, userPassword)) {
      return user
    }

    return null
  }

  @Mutation(() => User, {nullable: true})
  async signUp(@Ctx() context: Context, @Arg('data') data: SignUpInput) {
    const {hashPassword, prisma} = context
    const {email, name, password} = data

    const user = await prisma.user.findUnique({
      where: {email},
    })

    if (user !== null) {
      return null
    }

    const hashedPassword = await hashPassword(password)

    return prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
    })
  }
}

