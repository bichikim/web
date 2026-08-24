import {type JSX} from 'solid-js'

import {PRecoveryBoundary} from 'src/components/PRecoveryBoundary'
import {useApplicationRecovery} from 'src/features/application-recovery'

interface TestRecoveryProps {
  readonly children?: JSX.Element
  readonly onReload: () => void
  readonly reportError: (error: unknown) => string
}

export const TestRecovery = (props: TestRecoveryProps) => {
  const recovery = useApplicationRecovery({
    onReload: () => props.onReload(),
    reportError: (error) => props.reportError(error),
  })

  return (
    <PRecoveryBoundary
      canRetry={recovery.canRetry}
      onError={recovery.onError}
      onReady={recovery.onReady}
      onReload={recovery.onReload}
      onRetry={recovery.onRetry}
    >
      {props.children}
    </PRecoveryBoundary>
  )
}
