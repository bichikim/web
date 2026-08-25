import {render, waitFor} from '@solidjs/testing-library'
import type {Accessor} from 'solid-js'
import {expect} from 'vitest'

import {
  type PEventContextValue,
  usePEvents,
} from '../../../features/focus-room-dialogue/event-context'
import {PEventProvider} from '../../PEventProvider'

export interface RenderContextOptions {
  readonly enter?: boolean
  readonly isPlaybackEnabled?: Accessor<boolean>
}

export const renderContext = async (options: RenderContextOptions = {}) => {
  const eventReference: {current?: PEventContextValue} = {}
  const Consumer = () => {
    eventReference.current = usePEvents()
    return null
  }
  const result = render(() => (
    <PEventProvider isPlaybackEnabled={options.isPlaybackEnabled?.()}>
      <Consumer />
    </PEventProvider>
  ))
  await waitFor(() => expect(eventReference.current?.isLoading()).toBe(false))

  if (eventReference.current === undefined) {
    throw new Error('Expected the focus room event context to be captured.')
  }

  if (options.enter ?? true) {
    eventReference.current.enterFocusRoom()
  }

  return {events: eventReference.current, result}
}
