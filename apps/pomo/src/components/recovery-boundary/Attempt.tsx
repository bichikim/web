import {type JSX, onMount} from 'solid-js'

interface RecoveryAttemptProps {
  readonly children?: JSX.Element
  readonly onReady: () => void
}

export const RecoveryAttempt = (props: RecoveryAttemptProps) => {
  onMount(() => props.onReady())
  return <>{props.children}</>
}
