import {type Accessor, createSignal, onCleanup, onMount, type Setter} from 'solid-js'

import {
  type DesktopMode,
  isDesktopMode,
  readCleanExit,
  readDesktopMode,
  readDesktopModeOwnerStorage,
  writeCleanExit,
  writeDesktopMode,
  writeDesktopModeOwnerStorage,
} from './model'
import {
  applyDesktopMode,
  finishDesktopModeTransition,
  prepareDesktopModeTransition,
  shouldHandoffDesktopModeOwner,
} from './runtime'
import {getDesktopErrorMessage} from './error'

const MODE_CHANNEL = 'pomo:desktop-mode'
const MODE_EVENT = 'desktop-mode-requested'
const handleBeforeUnload = () => writeCleanExit(true)

interface ModeRequestMessage {
  readonly mode: DesktopMode
  readonly requestId: string
  readonly type: 'mode-requested'
}

interface ModeCompletedMessage {
  readonly requestId: string
  readonly type: 'mode-change-completed'
}

interface ModeFailedMessage {
  readonly message: string
  readonly requestId: string
  readonly type: 'mode-change-failed'
}

interface ModeOwnerReleasedMessage {
  readonly type: 'mode-owner-released'
}

interface ModeOwnerReclaimedMessage {
  readonly type: 'mode-owner-reclaimed'
}

interface PendingModeRequest {
  readonly reject: (error: Error) => void
  readonly requestId: string
  readonly resolve: () => void
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isModeRequestMessage = (value: unknown): value is ModeRequestMessage =>
  isRecord(value) &&
  value.type === 'mode-requested' &&
  typeof value.requestId === 'string' &&
  isDesktopMode(value.mode)

const isModeCompletedMessage = (value: unknown): value is ModeCompletedMessage =>
  isRecord(value) && value.type === 'mode-change-completed' && typeof value.requestId === 'string'

const isModeFailedMessage = (value: unknown): value is ModeFailedMessage =>
  isRecord(value) &&
  value.type === 'mode-change-failed' &&
  typeof value.requestId === 'string' &&
  typeof value.message === 'string'

const isModeOwnerReleasedMessage = (value: unknown): value is ModeOwnerReleasedMessage =>
  isRecord(value) && value.type === 'mode-owner-released'

const isModeOwnerReclaimedMessage = (value: unknown): value is ModeOwnerReclaimedMessage =>
  isRecord(value) && value.type === 'mode-owner-reclaimed'

interface ModeChannelMessageContext {
  readonly channel: BroadcastChannel
  readonly getPendingRequest: () => PendingModeRequest | null
  readonly isSurfaceOwner: () => boolean
  readonly onModeChangeRequested: (mode: DesktopMode) => Promise<void>
  readonly onModeOwnerReclaimed: () => void
  readonly onModeOwnerReleased: () => void
  readonly onModeReceived: (mode: DesktopMode) => void
  readonly onRequestFailed: (message: string) => void
  readonly setPendingRequest: (request: PendingModeRequest | null) => void
}

const handleModeChannelMessage = (
  event: MessageEvent<unknown>,
  context: ModeChannelMessageContext,
): void => {
  if (isDesktopMode(event.data)) {
    context.onModeReceived(event.data)
    return
  }

  if (isModeOwnerReleasedMessage(event.data)) {
    context.onModeOwnerReleased()
    return
  }

  if (isModeOwnerReclaimedMessage(event.data)) {
    context.onModeOwnerReclaimed()
    return
  }

  if (context.isSurfaceOwner() && isModeRequestMessage(event.data)) {
    const request = event.data
    context
      .onModeChangeRequested(request.mode)
      .then(() =>
        context.channel.postMessage({requestId: request.requestId, type: 'mode-change-completed'}),
      )
      .catch((requestError: unknown) =>
        context.channel.postMessage({
          message: getDesktopErrorMessage(requestError),
          requestId: request.requestId,
          type: 'mode-change-failed',
        }),
      )
    return
  }

  const activeRequest = context.getPendingRequest()
  if (activeRequest === null) {
    return
  }

  if (isModeCompletedMessage(event.data) && event.data.requestId === activeRequest.requestId) {
    context.setPendingRequest(null)
    activeRequest.resolve()
  } else if (isModeFailedMessage(event.data) && event.data.requestId === activeRequest.requestId) {
    context.setPendingRequest(null)
    const requestError = new Error(event.data.message)
    context.onRequestFailed(requestError.message)
    activeRequest.reject(requestError)
  }
}

const createModeQueue = (changeMode: (mode: DesktopMode) => Promise<void>) => {
  let transitionQueue = Promise.resolve()

  return (nextMode: DesktopMode): Promise<void> => {
    const transition = transitionQueue.then(() => changeMode(nextMode))
    transitionQueue = transition.catch(() => undefined)
    return transition
  }
}

const listenToNativeModeRequests = async (
  onModeRequested: (mode: DesktopMode) => void,
): Promise<() => void> => {
  const {listen} = await import('@tauri-apps/api/event')
  return listen<string>(MODE_EVENT, (event) => {
    if (isDesktopMode(event.payload)) {
      onModeRequested(event.payload)
    }
  })
}

export interface DesktopModeController {
  readonly error: Accessor<string | null>
  readonly isChanging: Accessor<boolean>
  readonly mode: Accessor<DesktopMode>
  readonly onModeChange: (mode: DesktopMode) => Promise<void>
}

export interface UseDesktopModeProps {
  /** Enables ownership handoff for a control surface that outlives the main background page. */
  readonly isHandoffOwner?: boolean
  readonly isSurfaceOwner?: boolean
}

interface ModeControllerState {
  readonly error: Accessor<string | null>
  readonly handoffOwner: boolean
  readonly isChanging: Accessor<boolean>
  readonly mode: Accessor<DesktopMode>
  readonly setError: Setter<string | null>
  readonly setIsChanging: Setter<boolean>
  readonly setMode: Setter<DesktopMode>
  readonly surfaceOwner: boolean
  channel: BroadcastChannel | null
  isDisposed: boolean
  isNativeListenerStarting: boolean
  ownsModeTransitions: boolean
  pendingRequest: PendingModeRequest | null
  removeModeListener: (() => void) | null
  requestMode: ((mode: DesktopMode) => Promise<void>) | null
}

const publishMode = (state: ModeControllerState, nextMode: DesktopMode) => {
  writeDesktopMode(nextMode)
  state.setMode(nextMode)
  state.channel?.postMessage(nextMode)
}

const relinquishModeOwnership = (state: ModeControllerState) => {
  state.ownsModeTransitions = false
  state.removeModeListener?.()
  state.removeModeListener = null
}

const startNativeModeListener = (state: ModeControllerState) => {
  if (state.removeModeListener !== null || state.isNativeListenerStarting) {
    return
  }

  state.isNativeListenerStarting = true
  listenToNativeModeRequests((nextMode) => {
    if (state.ownsModeTransitions) {
      const request = state.requestMode?.(nextMode)
      request?.catch(() => undefined)
    }
  })
    .then((unlisten) => {
      state.isNativeListenerStarting = false
      if (state.isDisposed || !state.ownsModeTransitions) {
        unlisten()
      } else {
        state.removeModeListener = unlisten
      }
    })
    .catch((listenError: unknown) => {
      state.isNativeListenerStarting = false
      if (!state.isDisposed) {
        state.setError(getDesktopErrorMessage(listenError))
      }
    })
}

const activateHandoffOwner = (state: ModeControllerState) => {
  if (state.ownsModeTransitions || !state.handoffOwner) {
    return
  }

  state.ownsModeTransitions = true
  state.setMode(readDesktopMode())
  startNativeModeListener(state)
}

const deactivateHandoffOwner = (state: ModeControllerState) => {
  if (state.surfaceOwner || !state.handoffOwner) {
    return
  }

  relinquishModeOwnership(state)
}

const prepareOwnerHandoff = async (
  state: ModeControllerState,
  nextMode: DesktopMode,
): Promise<boolean> => {
  if (!state.surfaceOwner || !(await shouldHandoffDesktopModeOwner(nextMode))) {
    return false
  }

  relinquishModeOwnership(state)
  writeDesktopModeOwnerStorage('released')
  writeDesktopMode(nextMode)
  state.channel?.postMessage({type: 'mode-owner-released'})
  return true
}

const reconcileModeOwner = (
  state: ModeControllerState,
  usesWebsiteBackground: boolean,
  releasedForTransition: boolean,
): boolean => {
  if (releasedForTransition && !usesWebsiteBackground) {
    state.ownsModeTransitions = true
    startNativeModeListener(state)
    writeDesktopModeOwnerStorage('primary')
    state.channel?.postMessage({type: 'mode-owner-reclaimed'})
    return false
  }

  if (state.surfaceOwner && usesWebsiteBackground && !releasedForTransition) {
    relinquishModeOwnership(state)
    writeDesktopModeOwnerStorage('released')
    state.channel?.postMessage({type: 'mode-owner-released'})
    return true
  }

  if (
    !releasedForTransition &&
    (state.surfaceOwner || (state.handoffOwner && state.ownsModeTransitions))
  ) {
    writeDesktopModeOwnerStorage('primary')
  }
  return releasedForTransition
}

const restoreMode = async (state: ModeControllerState, previousMode: DesktopMode) => {
  await applyDesktopMode(previousMode)
  await prepareDesktopModeTransition(previousMode)
  await finishDesktopModeTransition(previousMode)
  if (state.mode() !== previousMode) {
    publishMode(state, previousMode)
  }
}

const applyModeChange = async (state: ModeControllerState, nextMode: DesktopMode) => {
  if (nextMode === state.mode()) {
    return
  }

  state.setIsChanging(true)
  state.setError(null)
  const previousMode = state.mode()
  let releasedForTransition = false
  let persistedLocalReturn = false
  try {
    releasedForTransition = await prepareOwnerHandoff(state, nextMode)
    // Surface windows read the mode during their first mount, before the owner can broadcast it.
    const restoresLocalBackground = nextMode === 'normal' || nextMode === 'widget'
    if (
      nextMode === 'desktop' ||
      releasedForTransition ||
      (state.handoffOwner && state.ownsModeTransitions && restoresLocalBackground)
    ) {
      writeDesktopMode(nextMode)
    }
    if (state.handoffOwner && state.ownsModeTransitions && restoresLocalBackground) {
      persistedLocalReturn = true
      writeCleanExit(true)
    }
    const usesWebsiteBackground = await applyDesktopMode(nextMode)
    releasedForTransition = reconcileModeOwner(state, usesWebsiteBackground, releasedForTransition)
    await prepareDesktopModeTransition(nextMode)
    publishMode(state, nextMode)
    await finishDesktopModeTransition(nextMode)
  } catch (transitionError: unknown) {
    let reportedError = transitionError
    writeDesktopMode(previousMode)
    if (persistedLocalReturn) {
      writeCleanExit(false)
    }
    if (releasedForTransition) {
      state.ownsModeTransitions = true
      startNativeModeListener(state)
      state.channel?.postMessage({type: 'mode-owner-reclaimed'})
    }
    if (state.surfaceOwner || (state.handoffOwner && state.ownsModeTransitions)) {
      writeDesktopModeOwnerStorage('primary')
    }

    try {
      await restoreMode(state, previousMode)
    } catch (rollbackError: unknown) {
      reportedError = new AggregateError(
        [transitionError, rollbackError],
        'Desktop mode transition and rollback failed',
      )
    }

    state.setError(getDesktopErrorMessage(reportedError))
    throw reportedError
  } finally {
    state.setIsChanging(false)
  }
}

const requestOwnerMode = (state: ModeControllerState, nextMode: DesktopMode): Promise<void> => {
  if (state.isChanging() || nextMode === state.mode()) {
    return Promise.resolve()
  }

  const activeChannel = state.channel
  /* v8 ignore next -- onMount initializes the channel before consumers can call the controller. */
  if (activeChannel === null) {
    return Promise.reject(new Error('Desktop mode owner channel is not available'))
  }

  state.setIsChanging(true)
  state.setError(null)
  const requestId = crypto.randomUUID()
  return new Promise<void>((resolve, reject) => {
    state.pendingRequest = {reject, requestId, resolve}
    activeChannel.postMessage({mode: nextMode, requestId, type: 'mode-requested'})
  }).finally(() => state.setIsChanging(false))
}

const mountModeController = (
  state: ModeControllerState,
  queueModeChange: (mode: DesktopMode) => Promise<void>,
): void => {
  if (!(import.meta.env.VITE_POMO_IS_DESKTOP === 'true')) {
    return
  }

  const activeChannel = new BroadcastChannel(MODE_CHANNEL)
  state.channel = activeChannel
  activeChannel.addEventListener('message', (event: MessageEvent<unknown>) =>
    handleModeChannelMessage(event, {
      channel: activeChannel,
      getPendingRequest: () => state.pendingRequest,
      isSurfaceOwner: () => state.ownsModeTransitions,
      onModeChangeRequested: queueModeChange,
      onModeOwnerReclaimed: () => deactivateHandoffOwner(state),
      onModeOwnerReleased: () => activateHandoffOwner(state),
      onModeReceived: (nextMode) => {
        state.setError(null)
        state.setMode(nextMode)
      },
      onRequestFailed: (message) => state.setError(message),
      setPendingRequest: (request) => {
        state.pendingRequest = request
      },
    }),
  )

  if (state.surfaceOwner) {
    const storedMode = readCleanExit() ? readDesktopMode() : 'normal'
    writeDesktopModeOwnerStorage('primary')
    activeChannel.postMessage({type: 'mode-owner-reclaimed'})
    writeCleanExit(false)
    const request = state.requestMode?.(storedMode)
    request?.catch(() => undefined)
    window.addEventListener('beforeunload', handleBeforeUnload)
    startNativeModeListener(state)
    onCleanup(() => window.removeEventListener('beforeunload', handleBeforeUnload))
  } else if (state.handoffOwner) {
    state.setMode(readDesktopMode())
    if (readDesktopModeOwnerStorage() === 'released') {
      activateHandoffOwner(state)
    }
  } else {
    state.setMode(readDesktopMode())
  }

  onCleanup(() => {
    state.isDisposed = true
    state.pendingRequest?.reject(new Error('Desktop mode controller was disposed'))
    state.pendingRequest = null
    state.removeModeListener?.()
    state.channel?.close()
    state.channel = null
  })
}

/** Owns desktop mode persistence, native transitions, and cross-window convergence. */
export const useDesktopMode = (props: UseDesktopModeProps = {}): DesktopModeController => {
  const [mode, setMode] = createSignal<DesktopMode>('normal')
  const [isChanging, setIsChanging] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  const surfaceOwner = props.isSurfaceOwner ?? false
  const handoffOwner = props.isHandoffOwner ?? false
  const state: ModeControllerState = {
    channel: null,
    error,
    handoffOwner,
    isChanging,
    isDisposed: false,
    isNativeListenerStarting: false,
    mode,
    ownsModeTransitions: surfaceOwner,
    pendingRequest: null,
    removeModeListener: null,
    requestMode: null,
    setError,
    setIsChanging,
    setMode,
    surfaceOwner,
  }
  const queueModeChange = createModeQueue((nextMode) => applyModeChange(state, nextMode))
  const requestMode = (nextMode: DesktopMode) => queueModeChange(nextMode).catch(() => undefined)
  state.requestMode = requestMode
  const onModeChange = (nextMode: DesktopMode): Promise<void> => {
    if (!(import.meta.env.VITE_POMO_IS_DESKTOP === 'true')) {
      return Promise.resolve()
    }

    return state.ownsModeTransitions ? queueModeChange(nextMode) : requestOwnerMode(state, nextMode)
  }

  onMount(() => mountModeController(state, queueModeChange))

  return {error, isChanging, mode, onModeChange}
}
