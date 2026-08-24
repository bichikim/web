import {type ClientErrorReporter, reportClientError} from './reporter'

interface ClientErrorHandlerState {
  readonly previousReportErrorDescriptor: PropertyDescriptor | undefined
  readonly registrations: Array<ClientErrorHandlerRegistration>
  readonly reportError: (error: unknown) => void
  readonly removeListeners: () => void
}

interface ClientErrorHandlerRegistration {
  readonly reporter: ClientErrorReporter
}

const HANDLER_STATE = Symbol.for('pomofi.client-error-handlers.v1')

const getHandlerHost = () =>
  globalThis as typeof globalThis & {[HANDLER_STATE]?: ClientErrorHandlerState}

const getErrorEventValue = (event: ErrorEvent): unknown =>
  event.error ?? {message: 'Browser error without an Error object', name: 'ErrorEvent'}

const reportSafely = (
  state: ClientErrorHandlerState,
  error: unknown,
  source: 'global-error' | 'report-error' | 'unhandled-rejection',
) => {
  try {
    state.registrations.at(-1)?.reporter.report(error, {feature: 'application', source})
  } catch {
    // A replacement reporter cannot be allowed to recurse through global error handling.
  }
}

const restoreReportError = (state: ClientErrorHandlerState) => {
  try {
    if (state.previousReportErrorDescriptor === undefined) {
      Reflect.deleteProperty(globalThis, 'reportError')
    } else {
      Object.defineProperty(globalThis, 'reportError', state.previousReportErrorDescriptor)
    }
  } catch {
    // A host-controlled reportError property may not be configurable.
  }
}

const installReportError = (state: ClientErrorHandlerState) => {
  try {
    Object.defineProperty(globalThis, 'reportError', {
      configurable: true,
      value: state.reportError,
      writable: true,
    })
  } catch {
    // Global error and rejection listeners still provide the browser safety net.
  }
}

const readPreviousReportError = (
  descriptor: PropertyDescriptor | undefined,
): ((error: unknown) => void) | undefined => {
  try {
    const value = descriptor === undefined ? undefined : Reflect.get(globalThis, 'reportError')
    return typeof value === 'function' ? value : undefined
  } catch {
    return undefined
  }
}

const createHandlerState = (
  registration: ClientErrorHandlerRegistration,
): ClientErrorHandlerState => {
  const previousReportErrorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'reportError')
  const previousReportError = readPreviousReportError(previousReportErrorDescriptor)
  const handleError = (event: ErrorEvent) => {
    reportSafely(state, getErrorEventValue(event), 'global-error')
  }
  const handleRejection = (event: PromiseRejectionEvent) => {
    reportSafely(state, event.reason, 'unhandled-rejection')
  }
  const state = {
    previousReportErrorDescriptor,
    registrations: [registration],
    removeListeners: () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    },
    reportError: (error: unknown) => {
      reportSafely(state, error, 'report-error')
      try {
        previousReportError?.call(globalThis, error)
      } catch {
        // The native reporter is diagnostic-only and cannot block application recovery.
      }
    },
  } satisfies ClientErrorHandlerState

  window.addEventListener('error', handleError)
  window.addEventListener('unhandledrejection', handleRejection)
  installReportError(state)
  return state
}

export interface InstallClientErrorHandlersOptions {
  readonly reporter?: ClientErrorReporter
}

export const installClientErrorHandlers = (
  options: InstallClientErrorHandlersOptions = {},
): (() => void) => {
  const host = getHandlerHost()
  const reporter = options.reporter ?? {
    report: (error, reportOptions) => ({
      deduplicated: false,
      errorId: reportClientError(error, reportOptions),
    }),
  }
  const registration = {reporter} satisfies ClientErrorHandlerRegistration
  const existingState = host[HANDLER_STATE]

  if (existingState === undefined) {
    host[HANDLER_STATE] = createHandlerState(registration)
  } else {
    existingState.registrations.push(registration)
  }

  let disposed = false

  return () => {
    if (disposed) {
      return
    }

    disposed = true
    const state = host[HANDLER_STATE]
    if (state === undefined) {
      return
    }

    const registrationIndex = state.registrations.indexOf(registration)
    if (registrationIndex === -1) {
      return
    }

    state.registrations.splice(registrationIndex, 1)
    if (state.registrations.length > 0) {
      return
    }

    state.removeListeners()
    restoreReportError(state)
    Reflect.deleteProperty(host, HANDLER_STATE)
  }
}
