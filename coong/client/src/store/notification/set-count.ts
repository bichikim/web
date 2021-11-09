import {mutate} from 'vare'
import {notification} from './state'

export const setCount = mutate(notification, (state, count: number) => {
  state.count = count
})
