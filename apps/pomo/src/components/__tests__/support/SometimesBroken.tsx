import {type Accessor, Show, untrack} from 'solid-js'

import {ThrowError} from './ThrowError'

interface SometimesBrokenProps {
  readonly failure: Accessor<'initial' | 'later' | null>
  readonly onLaterFailure: () => void
  readonly shouldFailInitially: () => boolean
}

const LATER_FAILURE = new Error('later failure')

export const SometimesBroken = (props: SometimesBrokenProps) => {
  if (untrack(() => props.shouldFailInitially())) {
    throw new Error('initial failure')
  }

  return (
    <Show fallback={<ThrowError error={LATER_FAILURE} />} when={props.failure() !== 'later'}>
      <button onClick={() => props.onLaterFailure()}>나중에 실패</button>
    </Show>
  )
}
