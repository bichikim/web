import {Context} from 'src/context'
import {Post, User} from 'src/prisma/type-graphql'
import {Ctx, FieldResolver, Query, Resolver, Root} from 'type-graphql'

// import {SignInInput, SignUpInput} from './args'

@Resolver()
export class PostResolver {
  @Query()
  posts(@Ctx() {prisma}: Context): Promise<Post[]> {
    return prisma.post.findMany()
  }

  @FieldResolver()
  async author(@Root() post: Post, @Ctx() {prisma}: Context): Promise<User | null> {
    return prisma.post
      .findUnique({
        where: {id: post.id},
      })
      .author()
  }
}
