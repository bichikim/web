import {render} from 'solid-js/web'

import {PuppetEditor} from './editor'
import './dev.css'

const rootElement = document.querySelector('#root')

if (!(rootElement instanceof HTMLElement)) {
  throw new Error('Puppet root element was not found')
}

render(() => <PuppetEditor />, rootElement)
