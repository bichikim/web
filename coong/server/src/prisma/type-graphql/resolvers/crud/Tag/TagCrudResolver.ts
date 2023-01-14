import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { AggregateTagArgs } from "./args/AggregateTagArgs";
import { CreateManyTagArgs } from "./args/CreateManyTagArgs";
import { CreateOneTagArgs } from "./args/CreateOneTagArgs";
import { DeleteManyTagArgs } from "./args/DeleteManyTagArgs";
import { DeleteOneTagArgs } from "./args/DeleteOneTagArgs";
import { FindFirstTagArgs } from "./args/FindFirstTagArgs";
import { FindFirstTagOrThrowArgs } from "./args/FindFirstTagOrThrowArgs";
import { FindManyTagArgs } from "./args/FindManyTagArgs";
import { FindUniqueTagArgs } from "./args/FindUniqueTagArgs";
import { FindUniqueTagOrThrowArgs } from "./args/FindUniqueTagOrThrowArgs";
import { GroupByTagArgs } from "./args/GroupByTagArgs";
import { UpdateManyTagArgs } from "./args/UpdateManyTagArgs";
import { UpdateOneTagArgs } from "./args/UpdateOneTagArgs";
import { UpsertOneTagArgs } from "./args/UpsertOneTagArgs";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";
import { Tag } from "../../../models/Tag";
import { AffectedRowsOutput } from "../../outputs/AffectedRowsOutput";
import { AggregateTag } from "../../outputs/AggregateTag";
import { TagGroupBy } from "../../outputs/TagGroupBy";

@TypeGraphQL.Resolver(_of => Tag)
export class TagCrudResolver {
  @TypeGraphQL.Query(_returns => AggregateTag, {
    nullable: false
  })
  async aggregateTag(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: AggregateTagArgs): Promise<AggregateTag> {
    return getPrismaFromContext(ctx).tag.aggregate({
      ...args,
      ...transformInfoIntoPrismaArgs(info),
    });
  }

  @TypeGraphQL.Mutation(_returns => AffectedRowsOutput, {
    nullable: false
  })
  async createManyTag(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: CreateManyTagArgs): Promise<AffectedRowsOutput> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).tag.createMany({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Mutation(_returns => Tag, {
    nullable: false
  })
  async createOneTag(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: CreateOneTagArgs): Promise<Tag> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).tag.create({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Mutation(_returns => AffectedRowsOutput, {
    nullable: false
  })
  async deleteManyTag(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: DeleteManyTagArgs): Promise<AffectedRowsOutput> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).tag.deleteMany({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Mutation(_returns => Tag, {
    nullable: true
  })
  async deleteOneTag(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: DeleteOneTagArgs): Promise<Tag | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).tag.delete({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Query(_returns => Tag, {
    nullable: true
  })
  async findFirstTag(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindFirstTagArgs): Promise<Tag | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).tag.findFirst({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Query(_returns => Tag, {
    nullable: true
  })
  async findFirstTagOrThrow(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindFirstTagOrThrowArgs): Promise<Tag | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).tag.findFirstOrThrow({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Query(_returns => [Tag], {
    nullable: false
  })
  async tags(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindManyTagArgs): Promise<Tag[]> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).tag.findMany({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Query(_returns => Tag, {
    nullable: true
  })
  async tag(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindUniqueTagArgs): Promise<Tag | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).tag.findUnique({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Query(_returns => Tag, {
    nullable: true
  })
  async getTag(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindUniqueTagOrThrowArgs): Promise<Tag | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).tag.findUniqueOrThrow({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Query(_returns => [TagGroupBy], {
    nullable: false
  })
  async groupByTag(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: GroupByTagArgs): Promise<TagGroupBy[]> {
    const { _count, _avg, _sum, _min, _max } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).tag.groupBy({
      ...args,
      ...Object.fromEntries(
        Object.entries({ _count, _avg, _sum, _min, _max }).filter(([_, v]) => v != null)
      ),
    });
  }

  @TypeGraphQL.Mutation(_returns => AffectedRowsOutput, {
    nullable: false
  })
  async updateManyTag(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: UpdateManyTagArgs): Promise<AffectedRowsOutput> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).tag.updateMany({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Mutation(_returns => Tag, {
    nullable: true
  })
  async updateOneTag(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: UpdateOneTagArgs): Promise<Tag | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).tag.update({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Mutation(_returns => Tag, {
    nullable: false
  })
  async upsertOneTag(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: UpsertOneTagArgs): Promise<Tag> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).tag.upsert({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
