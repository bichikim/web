import {Message} from './context'

export interface NotificationItemProps extends Message {}

export const NotificationItem = (props: NotificationItemProps) => {
  return (
    <div class="bg-white rounded-lg p-4 shadow-lg">
      <div class="text-lg font-bold">{props.message}</div>
    </div>
  )
}
