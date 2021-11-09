import {compute} from 'vare'
import {notification} from './state'

export const getMultiplyCount = compute(notification, (state, count: number = 1) => {
  return (state.count ?? 0) * count
})
