import {createNanoEvents, Unsubscribe} from 'nanoevents'
import {Event, WalletEvent} from './types'

export const createEvents = (): WalletEvent => {
  const emitter = createNanoEvents()
  function on(event: Event, callback: (account: any) => any): Unsubscribe {
    return emitter.on(event, callback)
  }
  const once = (event: Event, callback: (...args: any[]) => any): Unsubscribe => {
    const unbind = emitter.on(event, (...args: any[]) => {
      unbind()
      return callback(...args)
    })
    return unbind
  }
  const emit = (event: Event, ...args: any[]) => {
    emitter.emit(event, ...args)
  }

  const stopAll = () => {
    emitter.events = {}
  }
  return {emit, on, once, stopAll}
}
