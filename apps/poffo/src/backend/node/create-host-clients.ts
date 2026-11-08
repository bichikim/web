import type {ServerResponse} from 'node:http'
import {randomUUID} from 'node:crypto'
import {encodeModelEvent} from '../model-events'
import type {ModelBackend} from '../types'
import type {ModelView} from '@winter-love/puppet/model'
import type {createRenderBroker} from './create-render-broker'

type ModelListener = Parameters<ModelBackend['subscribe']>[0]

export const createHostClients = (
  model: ModelBackend,
  renderer: ReturnType<typeof createRenderBroker>,
) => {
  let sequence = 0
  const owners = new Map<string, Set<string>>()
  const clients = new Map<ServerResponse, ModelListener>()
  const unsubscribe = model.subscribe((view) => {
    sequence += 1
    for (const listener of clients.values()) {
      listener(view)
    }
  })
  const detach = (clientId: string | null, response: ServerResponse) => {
    clients.delete(response)
    if (clientId === null) {
      return
    }
    const {transaction} = model.read()
    if (transaction !== null && owners.get(clientId)?.has(transaction.ownerId)) {
      model.request({ownerId: transaction.ownerId, requestId: randomUUID(), type: 'release'})
    }
    owners.delete(clientId)
    renderer.detach(clientId)
  }
  return {
    associate: (clientId: string | string[] | undefined, input: unknown) => {
      if (
        typeof clientId !== 'string' ||
        typeof input !== 'object' ||
        input === null ||
        !('ownerId' in input) ||
        typeof input.ownerId !== 'string'
      ) {
        return
      }
      const current = owners.get(clientId) ?? new Set<string>()
      current.add(input.ownerId)
      owners.set(clientId, current)
    },
    attach: (clientId: string | null, response: ServerResponse, metadata = false) => {
      let previous: ModelView | undefined
      const send = (view: ModelView) => {
        const event = encodeModelEvent(view, sequence, previous)
        previous = view
        response.write(`${JSON.stringify(event)}\n`)
      }
      clients.set(response, send)
      if (metadata) {
        previous = model.read()
        const {document: _document, ...event} = encodeModelEvent(previous, sequence)
        response.write(`${JSON.stringify(event)}\n`)
      } else {
        send(model.read())
      }
      if (clientId !== null) {
        renderer.attach(clientId, response)
      }
      response.once('close', () => detach(clientId, response))
    },
    close: () => {
      unsubscribe()
      for (const response of clients.keys()) {
        response.end()
      }
    },
    sequence: () => sequence,
  }
}
