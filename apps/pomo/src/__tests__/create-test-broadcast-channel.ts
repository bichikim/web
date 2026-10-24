import {vi} from 'vitest'
export interface TestBroadcastChannelOptions {
  readonly broadcast?: boolean
  readonly matchName?: boolean
  readonly removeOnClose?: boolean
}
/** Creates an isolated BroadcastChannel test environment with optional peer delivery. */
export const createTestBroadcastChannel = (options: TestBroadcastChannelOptions = {}) => {
  class TestBroadcastChannel {
    static instances: TestBroadcastChannel[] = []
    readonly listeners: Array<(event: MessageEvent) => void> = []
    onmessage: ((event: MessageEvent<unknown>) => void) | null = null
    readonly close = vi.fn(() => {
      if (options.removeOnClose === true) {
        TestBroadcastChannel.instances = TestBroadcastChannel.instances.filter(
          (channel) => channel !== this,
        )
      }
    })
    readonly postMessage = vi.fn((data: unknown) => {
      if (options.broadcast !== true) {
        return
      }
      for (const channel of TestBroadcastChannel.instances) {
        if (channel !== this && (options.matchName === false || channel.name === this.name)) {
          channel.dispatch(data)
        }
      }
    })
    constructor(readonly name: string) {
      TestBroadcastChannel.instances.push(this)
    }
    addEventListener(_type: string, listener: (event: MessageEvent) => void) {
      this.listeners.push(listener)
    }
    removeEventListener(_type: string, listener: (event: MessageEvent) => void) {
      const index = this.listeners.indexOf(listener)
      if (index >= 0) {
        this.listeners.splice(index, 1)
      }
    }
    dispatch(data: unknown) {
      const event = new MessageEvent('message', {data})
      this.onmessage?.(event)
      for (const listener of this.listeners) {
        listener(event)
      }
    }
  }
  return TestBroadcastChannel
}
