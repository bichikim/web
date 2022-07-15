import {Field, InputType} from 'type-graphql'

@InputType()
export class SharedAuthInput {
  @Field({
    nullable: false,
  })
  email: string

  @Field({
    nullable: false,
  })
  password: string
}
