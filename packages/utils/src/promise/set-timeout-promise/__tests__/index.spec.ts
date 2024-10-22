import {useFakeTimers} from 'sinon'
import {setTimeoutPromise} from '../'
import {describe, expect, it, vi} from 'vitest'
describe('set-timeout-promise', () => {
  it('should return a timeout promise', async () => {
    const clock = useFakeTimers()
    let end = false
    setTimeoutPromise(1000).then(() => {
      end = true
    })

    expect(end).toBe(false)
    await clock.tick(500)
    expect(end).toBe(false)
    await clock.tick(550)
    expect(end).toBe(true)

    clock.restore()
  })
})
