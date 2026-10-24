import {requestPane} from './request-pane.js'
import {setEditorTokens} from './pane-editor.js'
/** Loads the existing backend highlighter for the current unsaved document. */
export async function loadEditorTokens(engine, connection, document) {
  try {
    const result = await requestPane(engine, connection, 'code.highlight', {
      path: document.path,
      source: document.source,
    })
    if (Array.isArray(result.lines)) {
      setEditorTokens(document.path, document.source, result.lines)
    }
    engine.ui.invalidate('ui.render')
  } catch (error) {
    engine.ui.log(
      `Code Viewer highlighting: ${error instanceof Error ? error.message : String(error)}`,
      {to: 'debug'},
    )
  }
}
