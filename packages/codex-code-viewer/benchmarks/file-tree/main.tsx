import 'virtual:uno.css'
import {render} from 'solid-js/web'
import {SFileTreeBenchmark} from './SFileTreeBenchmark'

const root = document.getElementById('root')
if (root === null) {
  throw new Error('Missing benchmark root')
}
render(() => <SFileTreeBenchmark />, root)
