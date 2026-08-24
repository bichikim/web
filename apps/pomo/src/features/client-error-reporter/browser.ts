import {type ClientErrorReporter, reportClientError} from './reporter'

interface ClientErrorHandlerState {
  readonly previousReportErrorDescriptor: PropertyDescriptor | undefined
  references: number
  reporter: ClientErrorReporter
  readonly reportError: (error: unknown) => void
  readonly removeListeners: () => void
}

const HANDLER_STATE = Symbol.for('pomofi.client-error-handlers.v1')

const getHandlerHost = () =>
  globalThis as typeof globalThis & {[HANDLER_STATE]?: ClientErrorHandlerState}

const getErrorEventValue = (event: ErrorEvent): unknown =>
  event.error ?? {message: 'Browser error without an Error object', name: 'ErrorEvent'}

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

const createHandlerState = (reporter: ClientErrorReporter): ClientErrorHandlerState => {
  const previousReportErrorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'reportError')
  const previousReportError = globalThis.reportError
  const handleError = (event: ErrorEvent) => {
    state.reporter.report(getErrorEventValue(event), {
      feature: 'application',
      source: 'global-error',
    })
  }
  const handleRejection = (event: PromiseRejectionEvent) => {
    state.reporter.report(event.reason, {
      feature: 'application',
      source: 'unhandled-rejection',
    })
  }
  const state = {
    previousReportErrorDescriptor,
    references: 1,
    removeListeners: () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    },
    reporter,
    reportError: (error: unknown) => {
      state.reporter.report(error, {feature: 'application', source: 'report-error'})
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
  const existingState = host[HANDLER_STATE]

  if (existingState === undefined) {
    host[HANDLER_STATE] = createHandlerState(reporter)
  } else {
    existingState.references += 1
    existingState.reporter = reporter
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

    state.references -= 1
    if (state.references > 0) {
      return
    }

    state.removeListeners()
    restoreReportError(state)
    Reflect.deleteProperty(host, HANDLER_STATE)
  }
}
