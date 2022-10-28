import {Field, InputType} from 'type-graphql'

@InputType()
export class UpdateInput {
  @Field({nullable: true})
  title?: string | undefined

  @Field({nullable: true})
  message?: string
}
