import type {Protocol} from '@modelcontextprotocol/sdk/shared/protocol.js'
import {
  EmptyResultSchema,
  type Notification,
  type Request,
  type ResourceUpdatedNotification,
  ResourceUpdatedNotificationSchema,
  type Result,
} from '@modelcontextprotocol/sdk/types.js'

/** Manages standard MCP resource subscriptions and update listeners on one app connection. */
export const createResourceSubscriptions = (protocol: Protocol<Request, Notification, Result>) => {
  const handlers = new Set<(notification: ResourceUpdatedNotification) => void>()
  protocol.setNotificationHandler(ResourceUpdatedNotificationSchema, (notification) => {
    for (const handler of handlers) {
      handler(notification)
    }
  })
  return {
    addUpdateHandler: (handler: (notification: ResourceUpdatedNotification) => void) => {
      handlers.add(handler)
      return () => {
        handlers.delete(handler)
      }
    },
    subscribe: (params: {uri: string}) =>
      protocol.request({method: 'resources/subscribe', params}, EmptyResultSchema),
    unsubscribe: (params: {uri: string}) =>
      protocol.request({method: 'resources/unsubscribe', params}, EmptyResultSchema),
  }
}
