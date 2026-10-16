import {setImmediate} from 'node:timers/promises'
import {describe, expect, it, vi} from 'vitest'
import {createResultDelivery} from '../create-result-delivery'

describe('createResultDelivery', () => {
  it('should drain every published batch before propagating an earlier failure', async () => {
    const waiting = Promise.withResolvers<void>()
    const error = new Error('consumer failed')
    const receive = vi.fn().mockRejectedValueOnce(error).mockReturnValueOnce(waiting.promise)
    const delivery = createResultDelivery(receive)
    delivery.publish([])
    delivery.publish([])
    let settled = false
    const failed = expect(
      delivery.drain().finally(() => {
        settled = true
      }),
    ).rejects.toBe(error)
    await setImmediate()
    expect(settled).toBe(false)
    waiting.resolve()
    await failed
    expect(receive).toHaveBeenCalledTimes(2)
  })
  it('should cancel a pending consumption wait without requiring the consumer to finish', async () => {
    const waiting = Promise.withResolvers<void>()
    const delivery = createResultDelivery(() => waiting.promise)
    delivery.publish([])
    const controller = new AbortController()
    const stopped = new Error('cancelled')
    const drained = delivery.drain(controller.signal)
    controller.abort(stopped)
    await expect(drained).rejects.toBe(stopped)
    waiting.resolve()
  })
})
