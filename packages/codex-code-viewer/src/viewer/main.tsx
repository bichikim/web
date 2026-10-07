import 'virtual:uno.css'
import {render} from 'solid-js/web'
import {createHost} from './create-host'
import {SCodeViewer} from './SCodeViewer'

const root = document.getElementById('viewer')
if (root === null) {
  throw new Error('Missing Code Viewer mount point.')
}
render(() => <SCodeViewer port={createHost()} />, root)
