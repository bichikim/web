import * as TypeGraphQL from 'type-graphql'
import {Post} from '../../../models/Post'
import {Tag} from '../../../models/Tag'
import {TagPostsArgs} from './args/TagPostsArgs'
import {
  getPrismaFromContext,
  transformCountFieldIntoSelectRelationsCount,
  transformFields,
} from '../../../helpers'

@TypeGraphQL.Resolver((_of) => Tag)
export class TagRelationsResolver {
  @TypeGraphQL.FieldResolver((_type) => [Post], {
    nullable: false,
  })
  async posts(
    @TypeGraphQL.Root() tag: Tag,
    @TypeGraphQL.Ctx() ctx: any,
    @TypeGraphQL.Args() args: TagPostsArgs,
  ): Promise<Post[]> {
    return getPrismaFromContext(ctx)
      .tag.findUnique({
        where: {
          id: tag.id,
        },
      })
      .posts(args)
  }
}
