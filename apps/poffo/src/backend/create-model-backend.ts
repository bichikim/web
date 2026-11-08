import {
  createModelState,
  getModelView,
  type ModelChange,
  type ModelView,
  reduceModel,
} from '@winter-love/puppet/model'
import type {CreateModelBackendOptions, ModelBackend} from './types'

/** Owns one model and its history independently of GUI, transport, and storage. */
export const createModelBackend = (options: CreateModelBackendOptions): ModelBackend => {
  let state = createModelState(options)
  let change: ModelChange | null = null
  const listeners = new Set<Parameters<ModelBackend['subscribe']>[0]>()
  const read = () => getModelView(state, change)
  const notifications: ModelView[] = []
  let notifying = false
  const publish = (view: ModelView) => {
    notifications.push(view)
    if (notifying) {
      return
    }
    notifying = true
    try {
      while (notifications.length > 0) {
        const next = notifications.shift()!
        for (const listener of listeners) {
          listener(next)
        }
      }
    } finally {
      notifying = false
    }
  }
  return {
    read,
    request: (action) => {
      const result = reduceModel(state, action)
      if (!result.ok) {
        return result
      }
      const previous = state
      state = result.state
      if (result.change !== null) {
        change = result.change
      }
      if (result.change?.phase === 'commit' && result.change.kind !== 'reset') {
        options.onCommit?.(state.document, result.change)
      }
      const view = read()
      if (state !== previous) {
        publish(view)
      }
      return {changed: result.change !== null, ok: true, revision: result.state.revision}
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
