import {render} from 'solid-js/web'
import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
import App from './App'
import './styles.css'

const root = document.querySelector('#root')

if (root === null) {
  throw new Error('root element not found')
}

render(() => <App />, root)
