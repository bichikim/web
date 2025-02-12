export interface EmitPayload {
  channel: string | symbol
  event: any
}

export const createEmitter = () => {
  const _channels = new Map<string | symbol, Set<(event: any) => void>>()
  const poll: EmitPayload[] = []
  let executed = false

  const flushPoll = () => {
    for (const {channel, event} of poll) {
      for (const listener of _channels.get(channel) ?? []) {
        listener(event)
      }
    }

    poll.length = 0
    executed = false
  }

  return {
    emit(channel: string | symbol, event: any) {
      poll.push({channel, event})

      if (!executed) {
        queueMicrotask(flushPoll)
      }

      executed = true
    },

    off(channel: string | symbol, listener: (event: any) => void) {
      _channels.get(channel)?.delete(listener)
    },

    on(channel: string | symbol, listener: (event: any) => void) {
      let channelListeners = _channels.get(channel)

      if (!channelListeners) {
        channelListeners = new Set()
        _channels.set(channel, channelListeners)
      }

      channelListeners.add(listener)
    },
  }
}
