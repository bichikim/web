import {controlCommand} from './control-state.js'
import {closePopover} from './pane-popover.js'
import {receiveEditor, scrollEditorHorizontal} from './pane-editor.js'
import {paneClientCommand} from './pane-client-command.ts'
import {isTreeWidth} from './pane-preferences.ts'
import {changePaneHover} from './pane-hover.js'
/** Validates surface messages before entering ordered document or filesystem operations. */
export function receivePaneMessage(engine, event, context) {
  const element = event.element.startsWith('file-tree:')
    ? 'file-tree'
    : event.element === 'panel-divider:local-width'
      ? 'panel-divider'
      : event.element
  if (changePaneHover(element, event.data, context.tree())) {
    context.region(element === 'file-tree' ? 'tree' : 'code')
    engine.ui.invalidate('ui.render')
    return Promise.resolve()
  }
  const dispatch = (command) =>
    command === undefined ? Promise.resolve() : context.execute(() => context.dispatch(command))
  if (event.element === 'horizontal-scroll') {
    return context.execute(() => {
      scrollEditorHorizontal(event.data)
      engine.ui.invalidate('ui.render')
    })
  }
  if (event.element.startsWith('control:')) {
    return dispatch(controlCommand(event))
  }
  if (event.element === 'image-preview') {
    return dispatch(
      ['imagePan', 'imageFit', 'imageZoom'].includes(event.data?.kind) ? event.data : undefined,
    )
  }
  if (event.element === 'popover-backdrop') {
    closePopover()
    engine.ui.invalidate('ui.render')
    return Promise.resolve()
  }
  if (element === 'panel-divider') {
    if (event.data?.commit === true) {
      changePaneHover('panel-divider', {active: false, kind: 'hover'}, context.tree())
    }
    return event.data?.kind === 'resize' && isTreeWidth(event.data.value)
      ? context.resize(event.data.value, event.data.commit === true)
      : Promise.resolve()
  }
  context.region(element === 'file-tree' ? 'tree' : 'code')
  if (event.element === 'code-editor') {
    return context.execute(() => receiveEditor(event.data, context.editor))
  }
  return dispatch(paneClientCommand(event.data, context.tree()))
}
