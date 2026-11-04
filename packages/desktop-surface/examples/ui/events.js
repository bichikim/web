const {
  core: {invoke},
  event: {emitTo, listen},
  webviewWindow: {getCurrentWebviewWindow},
} = globalThis.__TAURI__

const EVENT_TIMEOUT = 5_000

const verifyEvent = async (subscribe, trigger) => {
  const notification = Promise.withResolvers()
  const stop = await subscribe(notification.resolve)
  const timeout = AbortSignal.timeout(EVENT_TIMEOUT)
  const reject = () => notification.reject(new Error('Native event did not arrive'))
  timeout.addEventListener('abort', reject, {once: true})
  try {
    await trigger()
    await notification.promise
  } finally {
    timeout.removeEventListener('abort', reject)
    stop()
  }
}

const verifyMonitorChange = (command) =>
  verifyEvent(
    (receive) => listen('desktop-surface-monitors-changed', receive),
    () => invoke(command),
  )

const verifyScopedEvents = async () => {
  const current = getCurrentWebviewWindow()
  const received = []
  const all = []
  const event = 'desktop-surface-scope-probe'
  const stop = await listen(event, ({payload}) => all.push(payload))
  try {
    await verifyEvent(
      (receive) =>
        current.listen(event, (message) => {
          received.push(message.payload)
          receive(message)
        }),
      async () => {
        await emitTo('controls', event, 'other')
        await emitTo(current.label, event, 'own')
      },
    )
    if (JSON.stringify(received) !== '["own"]' || JSON.stringify(all) !== '["other","own"]') {
      throw new Error(`Window event isolation failed: scoped=${received}, global=${all}`)
    }
  } finally {
    stop()
  }
}

export const verifyNativeEvents = async () => {
  await invoke('plugin:desktop-surface|open_control_surface', {
    options: {height: 250, label: 'controls', path: 'controls.html', width: 460},
  })
  await verifyScopedEvents()
  await verifyMonitorChange('disturb_background')
  await verifyMonitorChange('simulate_screen_wake')
}
