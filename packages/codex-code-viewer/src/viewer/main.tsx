import 'virtual:uno.css'
import {render} from 'solid-js/web'
import {createHost} from './create-host'
import {SCodeViewer} from './SCodeViewer'

const root = document.getElementById('viewer')
if (root === null) {
  throw new Error('Missing Code Viewer mount point.')
}
const integration = document.documentElement.dataset.host === 'standard' ? 'standard' : 'codex'
const fileClipboard = document.documentElement.dataset.fileClipboard === 'true'
const composerAttachment = document.documentElement.dataset.composerAttachment === 'true'
render(
  () => (
    <SCodeViewer
      port={createHost({
        composerAttachment,
        draftStorage:
          document.documentElement.dataset.draftStorage === 'true'
            ? () => globalThis.localStorage
            : undefined,
        fileClipboard,
        integration,
      })}
      embedded={integration === 'standard'}
    />
  ),
  root,
)
