/* eslint-disable no-magic-numbers */
import {MaxLength} from 'class-validator'
import {Field, InputType} from 'type-graphql'

@InputType()
export class SharedAuthInput {
  @Field({
    nullable: false,
  })
  @MaxLength(200)
  email: string

  @Field({
    nullable: false,
  })
  @MaxLength(100)
  password: string
}
