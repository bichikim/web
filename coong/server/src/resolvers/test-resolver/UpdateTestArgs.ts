import {ArgsType, Field} from 'type-graphql'

@ArgsType()
export class UpdateTestArgs {
  @Field()
  name: string
}
