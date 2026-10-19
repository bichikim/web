/* eslint-disable id-length -- Claude Mods validates the literal $ API parameter. */
import {hasPendingPath} from '../../../src/headless/index.ts'
/** Creates revision-checked operations for the entry selected in the native tree. */
export function createEntryActions($, context) {
  const check = (path) => {
    if (
      hasPendingPath(
        path,
        context
          .documents()
          .filter((entry) => entry.source !== entry.base)
          .map((entry) => entry.path),
      )
    ) {
      throw new Error('미저장 변경을 먼저 저장하거나 버려 주세요.')
    }
  }
  const inspect = () => {
    const {path} = context.selection()
    check(path)
    return context.request('code.entry', {path})
  }
  return {
    capture: async (action) => {
      context.capture({...(await inspect()), action})
      $.ui.invalidate('ui.render')
    },
    create: async (kind) => {
      const {name, parent} = context.selection()
      const entry = await context.request('code.create', {kind, name, parent})
      await context.refresh()
      if (kind === 'file') {
        await context.open(entry.path)
      }
    },
    paste: async () => {
      const clipboard = context.clipboard()
      if (clipboard === undefined) {
        return
      }
      check(clipboard.path)
      const result = await context.request('code.transfer', {
        action: clipboard.action,
        parent: context.selection().parent,
        path: clipboard.path,
        revision: clipboard.revision,
      })
      await context.changed(clipboard.path, result.path, clipboard.action)
    },
    remove: async () => {
      const current = await inspect()
      if ((await $.ui.ask(`${current.path} 항목을 삭제할까요?`, ['취소', '삭제'])) !== '삭제') {
        return
      }
      await context.request('code.remove', {path: current.path, revision: current.revision})
      await context.changed(current.path, '', 'delete')
    },
    rename: async () => {
      const current = await inspect()
      const changed = await context.request('code.rename', {
        name: context.selection().name,
        path: current.path,
        revision: current.revision,
      })
      await context.changed(current.path, changed.path, 'rename')
    },
  }
}
