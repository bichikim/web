import {AuthUser} from 'src/objects'
import {Arg, Ctx, FieldResolver, Mutation, Resolver, Root} from 'type-graphql'
import {Context} from 'src/context'
import {SignInInput, SignUpInput} from './args'

@Resolver(() => AuthUser)
export class AuthResolver {
  @Mutation(() => AuthUser, {nullable: true})
  async signIn(@Ctx() {prisma, passwordBcrypt}: Context, @Arg('data') data: SignInInput) {

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

    if (await passwordBcrypt.compare(password, userPassword)) {
      return user
    }

    return null
  }

  @Mutation(() => AuthUser, {nullable: true})
  async signUp(@Ctx() context: Context, @Arg('data') data: SignUpInput) {
    const {passwordBcrypt, prisma} = context
    const {email, name, password} = data

    const user = await prisma.user.findUnique({
      where: {email},
    })

    if (user !== null) {
      return null
    }

    const hashedPassword = await passwordBcrypt.hash(password)

    return prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
    })
  }

  @FieldResolver()
  async token(@Root() user: AuthUser, @Ctx() {jwt}: Context) {
    return jwt.sign({
      email: user.email,
      id: user.id,
      roles: user.roles,
    })
  }
}

