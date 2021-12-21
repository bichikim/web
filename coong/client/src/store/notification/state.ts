import {state, computeRef, mutate} from 'vare'

export interface NotificationState {
  count?: number
}

export const notification = state<NotificationState>({
  count: 4,
})
