import * as TypeGraphQL from 'type-graphql'
import {Comment} from '../../../models/Comment'
import {Post} from '../../../models/Post'
import {User} from '../../../models/User'
import {UserCommentsArgs} from './args/UserCommentsArgs'
import {UserFollowersArgs} from './args/UserFollowersArgs'
import {UserFollowingArgs} from './args/UserFollowingArgs'
import {UserLikePostsArgs} from './args/UserLikePostsArgs'
import {UserPostsArgs} from './args/UserPostsArgs'
import {
  getPrismaFromContext,
  transformCountFieldIntoSelectRelationsCount,
  transformFields,
} from '../../../helpers'

@TypeGraphQL.Resolver((_of) => User)
export class UserRelationsResolver {
  @TypeGraphQL.FieldResolver((_type) => [User], {
    nullable: false,
  })
  async followers(
    @TypeGraphQL.Root() user: User,
    @TypeGraphQL.Ctx() ctx: any,
    @TypeGraphQL.Args() args: UserFollowersArgs,
  ): Promise<User[]> {
    return getPrismaFromContext(ctx)
      .user.findUnique({
        where: {
          id: user.id,
        },
      })
      .followers(args)
  }

  @TypeGraphQL.FieldResolver((_type) => [User], {
    nullable: false,
  })
  async following(
    @TypeGraphQL.Root() user: User,
    @TypeGraphQL.Ctx() ctx: any,
    @TypeGraphQL.Args() args: UserFollowingArgs,
  ): Promise<User[]> {
    return getPrismaFromContext(ctx)
      .user.findUnique({
        where: {
          id: user.id,
        },
      })
      .following(args)
  }

  @TypeGraphQL.FieldResolver((_type) => [Post], {
    nullable: false,
  })
  async likePosts(
    @TypeGraphQL.Root() user: User,
    @TypeGraphQL.Ctx() ctx: any,
    @TypeGraphQL.Args() args: UserLikePostsArgs,
  ): Promise<Post[]> {
    return getPrismaFromContext(ctx)
      .user.findUnique({
        where: {
          id: user.id,
        },
      })
      .likePosts(args)
  }

  @TypeGraphQL.FieldResolver((_type) => [Post], {
    nullable: false,
  })
  async posts(
    @TypeGraphQL.Root() user: User,
    @TypeGraphQL.Ctx() ctx: any,
    @TypeGraphQL.Args() args: UserPostsArgs,
  ): Promise<Post[]> {
    return getPrismaFromContext(ctx)
      .user.findUnique({
        where: {
          id: user.id,
        },
      })
      .posts(args)
  }

  @TypeGraphQL.FieldResolver((_type) => [Comment], {
    nullable: false,
  })
  async comments(
    @TypeGraphQL.Root() user: User,
    @TypeGraphQL.Ctx() ctx: any,
    @TypeGraphQL.Args() args: UserCommentsArgs,
  ): Promise<Comment[]> {
    return getPrismaFromContext(ctx)
      .user.findUnique({
        where: {
          id: user.id,
        },
      })
      .comments(args)
  }
}
