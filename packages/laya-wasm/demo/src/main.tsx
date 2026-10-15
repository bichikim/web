import {render} from 'solid-js/web'
import {SLab} from './SLab'
import 'virtual:uno.css'

const root = document.getElementById('app')
if (root === null) {
  throw new Error('Missing application root.')
}
render(() => <SLab />, root)
