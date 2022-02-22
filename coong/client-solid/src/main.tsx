import {render} from 'solid-js/web'
import {App} from './App'

const el = document.querySelector('#app')
if (el) {
  render(App, el)
}

