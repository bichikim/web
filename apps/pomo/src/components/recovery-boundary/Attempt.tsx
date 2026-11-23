import {type JSX, onCleanup, onMount, Suspense} from 'solid-js'

interface RecoveryAttemptProps {
  readonly children?: JSX.Element
  readonly onReady: () => void
}

export const RecoveryAttempt = (props: RecoveryAttemptProps) => {
  let disposed = false
  let pending = false
  const notifyWhenReady = () => {
    if (!disposed && !pending) {
      props.onReady()
    }
  }
  const Pending = () => {
    pending = true
    onCleanup(() => {
      pending = false
      // A rejected resource can remove the pending boundary before the error fallback renders.
      queueMicrotask(notifyWhenReady)
    })
    return null
  }
  onMount(notifyWhenReady)
  onCleanup(() => {
    disposed = true
  })
  return <Suspense fallback={<Pending />}>{props.children}</Suspense>
}
