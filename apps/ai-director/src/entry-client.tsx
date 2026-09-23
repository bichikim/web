import {mount, StartClient} from '@solidjs/start/client'

const root = document.getElementById('root')
if (root === null) {
  throw new Error('Root element not found')
}
mount(() => <StartClient />, root)
