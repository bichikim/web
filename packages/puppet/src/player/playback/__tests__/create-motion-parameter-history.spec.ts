import {expect, it} from 'vitest'
import {createMotionParameterHistory} from '../create-motion-parameter-history'
import type {MotionFrame} from '../types'

const frame: MotionFrame = {
  blend: 'replace',
  motion: {duration: 1, id: 'idle', name: 'Idle', tracks: []},
  priority: 0,
  time: 0,
  weight: 1,
}
it('should release only the stopped motion channels while retaining other motion history', () => {
  const history = createMotionParameterHistory()
  history.record({gaze: 0.5, walk: 1})
  expect(history.base([frame])).toEqual({gaze: 0.5, walk: 1})
  history.reset(['walk'])
  expect(history.base([frame])).toEqual({gaze: 0.5})
  history.reset()
  expect(history.base([frame])).toEqual({})
})
