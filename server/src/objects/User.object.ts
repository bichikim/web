import {Field, ID, ObjectType} from 'type-graphql'

@ObjectType()
export class User {
  @Field(() => ID, {description: 'Database id'})
  id: string

  @Field({description: 'User\'s real world name'})
  name: string

  @Field({description: 'User\'s email'})
  email: string
}
