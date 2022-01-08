import {Field, ID, ObjectType} from 'type-graphql'

@ObjectType()
export class Test {
  @Field(() => ID, {description: 'Database id'})
    id: string

  @Field({description: 'User\'s real world name'})
    name: string
}
