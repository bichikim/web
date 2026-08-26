const {
  core: {invoke},
} = window.__TAURI__
const status = document.querySelector('#status')
const backgroundInteractionButton = document.querySelector('#background-interaction')
const interactionButton = document.querySelector('#interact')
const CONTROL_CLOSE_DELAY_MILLISECONDS = 250
const ASSERTION_RETRY_DELAY_MILLISECONDS = 50
const ASSERTION_RETRY_LIMIT = 100
let interactionCount = 0
let isBackgroundInteractive = true
let smokeMode = false
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

interactionButton.addEventListener('click', () => {
  interactionCount += 1
  interactionButton.textContent = `Interaction count: ${interactionCount}`
})

const setBackgroundInteraction = async (interaction) => {
  const isInteractive = interaction === 'interactive'
  backgroundInteractionButton.disabled = true
  status.value = isInteractive ? 'Enabling background input…' : 'Restoring click-through input…'

  try {
    await invoke('plugin:desktop-surface|set_background_interaction', {
      options: {interaction, label: 'background'},
    })
    const currentInteraction = await invoke('plugin:desktop-surface|get_background_interaction', {
      label: 'background',
    })
    if (currentInteraction !== interaction) {
      throw new Error(
        `Background interaction mismatch: expected ${interaction}, got ${currentInteraction}`,
      )
    }
    await invoke(isInteractive ? 'assert_background_interactive' : 'assert_background')
    await invoke('plugin:desktop-surface|open_control_surface', {
      options: {
        height: 250,
        label: 'controls',
        path: 'controls.html',
        width: 460,
      },
    })
    isBackgroundInteractive = isInteractive
    backgroundInteractionButton.textContent = isInteractive
      ? 'Disable background input'
      : 'Enable background input'
    status.value = isInteractive
      ? 'Background input enabled — click the counter on the desktop surface'
      : 'Click-through restored — Finder icons are available'
  } finally {
    backgroundInteractionButton.disabled = false
  }
}

backgroundInteractionButton.addEventListener('click', () => {
  setBackgroundInteraction(isBackgroundInteractive ? 'passThrough' : 'interactive').catch(
    (error) => {
      status.value = formatError(error)
    },
  )
})

const restoreBackground = async () => {
  status.value = 'Restoring…'
  await invoke('plugin:desktop-surface|restore_surface', {label: 'background'})
  await invoke('assert_restored')
  status.value = 'Background restored'
}

const verifyWidget = async () => {
  await invoke('plugin:desktop-surface|set_widget_surface', {
    options: {height: 520, label: 'background', width: 420},
  })
  await invoke('assert_widget')
  await invoke('plugin:desktop-surface|restore_surface', {label: 'background'})
  await invoke('assert_restored')
}

const verifyBackgroundSurfaceOptions = async () => {
  await invoke('plugin:desktop-surface|set_background_surface', {
    options: {interaction: 'passThrough', label: 'background'},
  })
  await invoke('assert_background')
  await invoke('plugin:desktop-surface|restore_surface', {label: 'background'})
  await invoke('assert_restored')
}

const verifyLifecycle = async () => {
  await invoke('disturb_background')
  await waitForAssertion('assert_background')
  await invoke('simulate_screen_sleep')
  await waitForAssertion('assert_background_hidden')
  await invoke('disturb_background')
  await waitForAssertion('assert_background_hidden')
  await invoke('simulate_screen_wake')
  await waitForAssertion('assert_background')
}

const verifyBackgroundInteraction = async () => {
  await setBackgroundInteraction('interactive')
  await setBackgroundInteraction('passThrough')
}

document.querySelector('#restore').addEventListener('click', () => {
  restoreBackground()
    .then(() => {
      if (!smokeMode) {
        setTimeout(() => {
          invoke('plugin:desktop-surface|close_control_surface', {label: 'controls'})
        }, CONTROL_CLOSE_DELAY_MILLISECONDS)
      }
    })
    .catch((error) => {
      status.value = formatError(error)
    })
})

invoke('harness_mode').then(({smoke}) => {
  smokeMode = smoke
  if (smoke) {
    waitForAssertion('assert_control')
      .then(() => {
        if (getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)') {
          throw new Error('control document background is not transparent')
        }

        interactionButton.click()

        if (interactionButton.textContent !== 'Interaction count: 1') {
          throw new Error('control surface interaction did not update the UI')
        }
      })
      .then(verifyBackgroundInteraction)
      .then(verifyLifecycle)
      .then(restoreBackground)
      .then(verifyWidget)
      .then(verifyBackgroundSurfaceOptions)
      .then(() => invoke('finish_smoke', {error: null}))
      .catch((error) => invoke('finish_smoke', {error: formatError(error)}))
  } else {
    waitForAssertion('assert_control')
      .then(() => {
        status.value = 'Transparency and pointer interaction verified'
      })
      .catch((error) => {
        status.value = formatError(error)
      })
  }
})
