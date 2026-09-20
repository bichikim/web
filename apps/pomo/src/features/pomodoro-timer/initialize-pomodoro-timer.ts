import type {Accessor} from 'solid-js'

import {type PomodoroTimerConfig, type PomodoroTimerState, synchronizePomodoroTimer} from './model'

export interface PomodoroTimerApplyStateOptions {
  readonly deferEvents?: boolean
  readonly eventPreviousState?: PomodoroTimerState
  readonly isCatchUp?: boolean
}

export interface PomodoroTimerInitializationOptions {
  readonly applyState: (
    nextState: PomodoroTimerState,
    options?: PomodoroTimerApplyStateOptions,
  ) => void
  readonly getAutoStartEnabled: Accessor<boolean>
  readonly getConfig: Accessor<PomodoroTimerConfig>
  readonly getState: Accessor<PomodoroTimerState>
  readonly getStateToRestore: () => PomodoroTimerState | null
  readonly isDisposed: () => boolean
  readonly setNow: (now: number) => void
  readonly setStorageReady: (isReady: boolean) => void
  readonly storedState: PomodoroTimerState
}

export const initializePomodoroTimer = (options: PomodoroTimerInitializationOptions) => {
  if (options.isDisposed()) {
    return
  }

  const autoStartNextPhase = options.getAutoStartEnabled()
  const restoredAt = Date.now()
  options.setNow(restoredAt)
  const currentState = options.getState()

  const stateToRestore = options.getStateToRestore()
  const stateToSynchronize =
    stateToRestore ?? (currentState === options.storedState ? currentState : null)

  if (stateToSynchronize !== null) {
    const synchronizedState = synchronizePomodoroTimer(
      stateToSynchronize,
      restoredAt,
      options.getConfig(),
      {
        autoStartNextPhase,
      },
    )

    options.applyState(synchronizedState, {
      deferEvents: !autoStartNextPhase,
      eventPreviousState: stateToRestore ?? undefined,
      isCatchUp: true,
    })
  }

  options.setStorageReady(true)
}
