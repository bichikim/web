import {render} from '@solidjs/testing-library'
import {afterEach, beforeEach, vi} from 'vitest'

import {type PEventContextValue, usePEvents} from '../../features/focus-room-dialogue/event-context'
import {PEventProvider} from '../PEventProvider'

vi.mock('../../features/focus-room-dialogue/repository', () => ({
  createPDialogueRepository: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:focus-room-dialogue')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

export const renderImmediateContext = (isPlaybackEnabled?: boolean) => {
  const eventReference: {current?: PEventContextValue} = {}
  const Consumer = () => {
    eventReference.current = usePEvents()
    return null
  }
  const result = render(() => (
    <PEventProvider isPlaybackEnabled={isPlaybackEnabled}>
      <Consumer />
    </PEventProvider>
  ))
  const events = eventReference.current

  if (events === undefined) {
    throw new Error('Expected the focus room event context to be captured synchronously.')
  }

  return {events, result}
}
