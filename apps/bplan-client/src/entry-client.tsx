/* eslint-disable n/no-unsupported-features/node-builtins */
// @refresh reload
import {mount, StartClient} from '@solidjs/start/client'

mount(() => <StartClient />, document.body.querySelector('#root')!)
