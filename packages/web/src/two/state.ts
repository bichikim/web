import {AnyObject, UnwrapNestedRefs} from '@/types'
import {reactive} from 'vue'

export type State<State> = UnwrapNestedRefs<State>

export const state = <State extends AnyObject>(initState: State) => {
  return reactive<State>(initState)
}
