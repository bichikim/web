export interface EmitterOptions {
  end?: () => void
  start?: () => void
}

export const NONE_CHANNEL_KEY = Symbol('none-channel-key')

export interface ChannelFilter {
  omit?: (string | symbol)[]
  pick?: (string | symbol)[]
}

export const createEmitter = <Event>(options: EmitterOptions = {}) => {
  let started = false
  const {end, start} = options
  const _channels = new Map<string | symbol, Set<(event: Event) => void>>()

  const triggerEach = (listeners: Set<(event: Event) => void>, event: Event) => {
    const promises = [...listeners.values()].map((listener) => listener(event))

    return Promise.all(promises)
  }

  const pickListenersMap = (channels: (string | symbol)[]) => {
    return new Map(
      channels.map((channel) => [channel, _channels.get(channel)]).filter(([, value]) => value) as [
        string | symbol,
        Set<(event: Event) => void>,
      ][],
    )
  }

  const filterListenersList = (channels: ChannelFilter = {}) => {
    const {pick, omit = []} = channels
    const nextListenersList = pick ? pickListenersMap(pick) : new Map(_channels)

    for (const channel of omit) {
      nextListenersList.delete(channel)
    }

    return [...nextListenersList.values()]
  }

  const trigger = (event: Event, channels?: ChannelFilter) => {
    const listenersList = channels ? filterListenersList(channels) : [..._channels.values()]

    const promises = listenersList.map((listeners) => {
      if (listeners) {
        return triggerEach(listeners, event)
      }

      return Promise.resolve()
    })

    return Promise.all(promises)
  }

  const getChannel = (channel: string | symbol): Set<(event: Event) => void> => {
    const listeners = _channels.get(channel)

    if (listeners) {
      return listeners
    }

    const newListeners = new Set<(event: Event) => void>()

    _channels.set(channel, newListeners)

    return newListeners
  }

  return {
    addEventListener: (listener: (event: Event) => void, channel: string | symbol = NONE_CHANNEL_KEY) => {
      const _listeners = getChannel(channel)

      _listeners.add(listener)

      if (!started) {
        start?.()
        started = true
      }
    },
    removeEventListener: (listener: (event: Event) => void, channel: string | symbol = NONE_CHANNEL_KEY) => {
      const _listeners = getChannel(channel)

      _listeners.delete(listener)

      if (_listeners.size === 0 && started) {
        end?.()
        started = false
      }
    },
    trigger,
  }
}
