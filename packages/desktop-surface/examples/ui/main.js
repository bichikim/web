const {
  core: {invoke},
} = globalThis.__TAURI__
const status = document.querySelector('#status')
const backgroundClickButton = document.querySelector('#background-click')
const ASSERTION_RETRY_DELAY_MILLISECONDS = 50
const ASSERTION_RETRY_LIMIT = 100
const WEBSITE_BACKGROUND_URL = 'https://example.com'
let backgroundClickCount = 0

const captureBaseline = () => waitForAssertion('capture_baseline')
const formatError = (error) =>
  error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message)
      : String(error)

const waitForRetry = () =>
  new Promise((resolve) => {
    setTimeout(resolve, ASSERTION_RETRY_DELAY_MILLISECONDS)
  })

const waitForAssertion = async (command, attemptsRemaining = ASSERTION_RETRY_LIMIT) => {
  try {
    await invoke(command)
  } catch (error) {
    if (attemptsRemaining <= 1) {
      throw new Error(formatError(error))
    }

    await waitForRetry()
    await waitForAssertion(command, attemptsRemaining - 1)
  }
}

const readWebsiteEventProbe = async (predicate, attemptsRemaining = ASSERTION_RETRY_LIMIT) => {
  try {
    const fragment = await invoke('read_website_event_probe')
    const events = fragment.startsWith('probe:')
      ? fragment.slice('probe:'.length).split(',').filter(Boolean)
      : []
    if (predicate(events)) {
      return events
    }
  } catch (error) {
    if (attemptsRemaining <= 1) {
      throw new Error(formatError(error))
    }
  }

  if (attemptsRemaining <= 1) {
    throw new Error('Website event probe did not reach the expected state.')
  }

  await waitForRetry()
  return readWebsiteEventProbe(predicate, attemptsRemaining - 1)
}

const forwardWebsiteEvent = (kind, overrides = {}) =>
  invoke('plugin:desktop-surface|forward_background_mouse_event', {
    options: {
      altKey: false,
      button: 0,
      buttons: 0,
      clickCount: 1,
      ctrlKey: false,
      kind,
      label: 'background',
      metaKey: false,
      shiftKey: false,
      x: 20,
      y: 20,
      ...overrides,
    },
  })

const verifyWebsiteEventRelay = async () => {
  await invoke('plugin:desktop-surface|navigate_background_surface', {
    options: {label: 'background', url: WEBSITE_BACKGROUND_URL, useChild: true},
  })
  await invoke('prepare_website_event_probe')
  await readWebsiteEventProbe((events) => events.length === 0)

  await forwardWebsiteEvent('moved')
  await forwardWebsiteEvent('down', {buttons: 1})
  await forwardWebsiteEvent('up', {clickCount: 2})
  await forwardWebsiteEvent('wheel', {deltaMode: 0, deltaX: 0, deltaY: 120, deltaZ: 0})
  await forwardWebsiteEvent('left')
  await forwardWebsiteEvent('down', {buttons: 1})
  await forwardWebsiteEvent('cancelled')

  const requiredEvents = [
    'pointerover',
    'pointerenter',
    'mouseover',
    'mouseenter',
    'pointermove',
    'mousemove',
    'pointerdown',
    'mousedown',
    'pointerup',
    'mouseup',
    'click',
    'dblclick',
    'wheel',
    'pointerout',
    'pointerleave',
    'mouseout',
    'mouseleave',
    'pointercancel',
  ]
  const events = await readWebsiteEventProbe((currentEvents) =>
    requiredEvents.every((eventName) => currentEvents.includes(eventName)),
  )
  status.value = `Website WebView events verified: ${events.length}`
}

const openDesktop = async () => {
  status.value = 'Applying desktop surface…'
  await captureBaseline()
  await invoke('plugin:desktop-surface|set_background_surface', {
    options: {interaction: 'interactive', label: 'background'},
  })
  await waitForAssertion('assert_background_interactive')
  await verifyWebsiteEventRelay()
  await invoke('plugin:desktop-surface|open_control_surface', {
    options: {
      height: 250,
      label: 'controls',
      path: 'controls.html',
      width: 460,
    },
  })
  status.value = 'Interactive desktop verified; background buttons accept clicks'
}

const openWidget = async () => {
  status.value = 'Applying widget surface…'
  await captureBaseline()
  await invoke('plugin:desktop-surface|set_widget_surface', {
    options: {cornerRadius: 20, height: 520, label: 'background', width: 420},
  })
  await invoke('assert_widget')
  status.value = 'Widget verified: 420×520, always on top, borderless, rounded, native shadow'
}

const restoreWindow = async () => {
  status.value = 'Restoring window…'
  await invoke('plugin:desktop-surface|restore_surface', {label: 'background'})
  await invoke('assert_restored')
  status.value = 'Window restoration verified'
}

backgroundClickButton.addEventListener('click', () => {
  backgroundClickCount += 1
  backgroundClickButton.textContent = `Background clicks: ${backgroundClickCount}`
})

document.querySelector('#enter').addEventListener('click', () => {
  openDesktop().catch((error) => {
    status.value = formatError(error)
  })
})

document.querySelector('#widget').addEventListener('click', () => {
  openWidget().catch((error) => {
    status.value = formatError(error)
  })
})

document.querySelector('#restore').addEventListener('click', () => {
  restoreWindow().catch((error) => {
    status.value = formatError(error)
  })
})

invoke('harness_mode').then(({smoke}) => {
  if (smoke) {
    openDesktop().catch((error) => invoke('finish_smoke', {error: formatError(error)}))
  }
})
