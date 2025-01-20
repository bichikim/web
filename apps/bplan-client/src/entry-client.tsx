/* eslint-disable n/no-unsupported-features/node-builtins */
// @refresh reload
import {mount, StartClient} from '@solidjs/start/client'
import {attachDevtoolsOverlay} from '@solid-devtools/overlay'

attachDevtoolsOverlay()

if (!import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}

mount(() => <StartClient />, document.body)
