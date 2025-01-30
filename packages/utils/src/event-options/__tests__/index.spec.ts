import {eventOptions} from '../'
import {isSupportPassive} from 'src/is-support-passive'
import {describe, expect, it, vi} from 'vitest'

vi.mock('src/is-support-passive')

const _isSupportPassive = vi.mocked(isSupportPassive)

describe('createEventOptions', () => {
  it('should create event options with supporting passive', () => {
    _isSupportPassive.mockReturnValueOnce(true)

    expect(eventOptions({capture: true, passive: true})).toEqual({
      capture: true,
      passive: true,
    })
  })

  it('should create event options without supporting passive', () => {
    _isSupportPassive.mockReturnValueOnce(false)

    expect(eventOptions({capture: true, passive: true})).toEqual({
      capture: true,
      passive: false,
    })
  })
})
