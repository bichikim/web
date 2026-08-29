const {
  core: {invoke},
} = window.__TAURI__
const status = document.querySelector('#status')
const backgroundClickButton = document.querySelector('#background-click')
const ASSERTION_RETRY_DELAY_MILLISECONDS = 50
const ASSERTION_RETRY_LIMIT = 100
let backgroundClickCount = 0

const captureBaseline = () => invoke('capture_baseline')
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

const openDesktop = async () => {
  status.value = 'Applying desktop surface…'
  await captureBaseline()
  await invoke('plugin:desktop-surface|set_background_surface', {
    options: {interaction: 'interactive', label: 'background'},
  })
  await waitForAssertion('assert_background_interactive')
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
    options: {height: 520, label: 'background', width: 420},
  })
  await invoke('assert_widget')
  status.value = 'Widget verified: 420×520, always on top, borderless'
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
