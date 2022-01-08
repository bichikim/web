import {Field, InputType} from 'type-graphql'
import {SharedAuthInput} from './SharedAuthInput'

@InputType()
export class SignUpInput extends SharedAuthInput {
  // empty
  @Field({
    nullable: true,
  })
    name: string
}
