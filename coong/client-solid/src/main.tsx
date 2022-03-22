import {render} from 'solid-js/web'
import {App} from './App'
import './main.css'

const el = document.querySelector('#app')
if (el) {
  render(App, el)
}

