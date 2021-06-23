import {setTimeoutPromise} from '../'
import {useFakeTimers} from 'sinon'

describe('set-timeout-promise', () => {
  it('should ', async () => {
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
