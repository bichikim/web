/* eslint-disable id-length -- Claude Mods validates the literal $ API parameter. */
import {sourceOffset} from '../../../src/headless/index.ts'
import {fields} from './pane-fields.js'
import {scrollPopover, showPopover} from './pane-popover.js'
/** Adapts explicit context actions to the existing editor and filesystem boundaries. */
export function createPopoverActions($, command, context) {
  const selectEntry = () => {
    fields.entryPath = command.path
    fields.folder =
      command.entryKind === 'directory'
        ? command.path
        : command.path.split('/').slice(0, -1).join('/')
    fields.entryName = command.path.split('/').at(-1)
  }
  return {
    codeMenu: () => {
      showPopover({kind: 'code', point: command.point, region: 'code'})
      $.ui.invalidate('ui.render')
    },
    copyCode: () => {
      const current = context.document()
      const from = sourceOffset(
        current.source,
        current.line,
        fields.startColumn === '' ? 1 : current.column,
      )
      const to =
        fields.startColumn === ''
          ? current.source.indexOf('\n', from)
          : sourceOffset(current.source, Number(fields.endLine), Number(fields.endColumn))
      return context.copy({
        path: current.path,
        text: current.source.slice(from, to < 0 ? undefined : to),
      })
    },
    copyPath: () =>
      context.copy({
        path: context.document()?.path ?? fields.entryPath,
        text: fields.entryPath,
      }),
    entryAction: () => {
      selectEntry()
      return context.dispatch(
        {
          copy: {action: 'copy', kind: 'capture'},
          cut: {action: 'cut', kind: 'capture'},
          paste: {kind: 'paste'},
          remove: {kind: 'remove'},
          rename: {kind: 'entryDialog', value: 'rename'},
        }[command.action],
      )
    },
    entryDialog: () => {
      if (command.value !== 'rename') {
        fields.entryName = ''
      }
      showPopover({action: command.value, kind: 'dialog', region: 'tree'})
      $.ui.invalidate('ui.render')
    },
    entryMenu: () => {
      selectEntry()
      showPopover({kind: 'tree', point: command.point, region: 'tree'})
      $.ui.invalidate('ui.render')
    },
    referenceScroll: () => {
      scrollPopover(command.by)
      $.ui.invalidate('ui.render')
    },
  }
}
