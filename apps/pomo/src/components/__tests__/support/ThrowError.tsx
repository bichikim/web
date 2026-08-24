import {untrack} from 'solid-js'

interface ThrowErrorProps {
  readonly error: Error
}

export const ThrowError = (props: ThrowErrorProps) => {
  throw untrack(() => props.error)
}
