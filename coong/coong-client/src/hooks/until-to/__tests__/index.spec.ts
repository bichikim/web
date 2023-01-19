import {useUntilTo} from '../'
import {useFakeTimers} from 'sinon'

describe('until-to', () => {
  it('should change number to 0', () => {
    const clock = useFakeTimers()
    const untilTo = useUntilTo(10)

    untilTo.run(0, 1)

    expect(untilTo.value.value).toBe(10)

    clock.tick(100)

    expect(untilTo.value.value).toBe(9)

    clock.tick(100)

    expect(untilTo.value.value).toBe(8)

    clock.tick(800)

    expect(untilTo.value.value).toBe(0)

    clock.tick(100)

    expect(untilTo.value.value).toBe(0)

    clock.restore()
  })
  it('should stop changing number to 0', () => {
    const clock = useFakeTimers()
    const untilTo = useUntilTo(10)

    untilTo.run(0, 1)

    expect(untilTo.value.value).toBe(10)

    clock.tick(100)

    expect(untilTo.value.value).toBe(9)

    clock.tick(100)

    expect(untilTo.value.value).toBe(8)

    untilTo.stop()

    clock.tick(800)

    expect(untilTo.value.value).toBe(8)

    clock.restore()
  })
  it('should rerun changing number to 0', () => {
    const clock = useFakeTimers()
    const untilTo = useUntilTo(10)

    untilTo.run(0, 1)

    expect(untilTo.value.value).toBe(10)

    clock.tick(100)

    expect(untilTo.value.value).toBe(9)

    untilTo.run(0, 2)

    clock.tick(100)

    expect(untilTo.value.value).toBe(7)

    clock.tick(800)

    expect(untilTo.value.value).toBe(0)

    clock.restore()
  })
})
