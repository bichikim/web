import {Field, InputType} from 'type-graphql'

@InputType()
export class UpdateWhereInput {
  @Field()
  id: string

  @Field()
  authorId: string
}
