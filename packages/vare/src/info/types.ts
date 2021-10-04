import {Ref} from 'vue-demi'

export interface PlaygroundInfo {
  args: any
}

export interface VareInfo<Identifier extends string> {
  description?: string
  identifier: Identifier
  name?: string
  playground?: PlaygroundInfo
  relates: Set<any>
  state?: any
  trigger?: Ref<any>
  type?: string | undefined
}

export interface VareInfoOptions<Identifier extends string> extends Omit<VareInfo<Identifier>, 'relates'>{
  relates?: Set<any>
}
