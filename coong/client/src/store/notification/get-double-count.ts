import {computeRef} from 'vare'
import {notification} from './state'

export const getDouble = computeRef(notification, () => {
  return (notification.count ?? 0) * 2
})
