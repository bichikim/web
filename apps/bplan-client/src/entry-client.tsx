// @refresh reload
import {mount, StartClient} from '@solidjs/start/client'

mount(() => <StartClient />, document.querySelector('#app') || document.body)
