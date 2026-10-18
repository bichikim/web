import type {ViewerContext} from './types'
import {formatSelection} from './format-selection'

/** Formats a file, folder, code range or draft patch as pending chat context. */
export const formatContext = (selection: ViewerContext): string => {
  if ('kind' in selection) {
    switch (selection.kind) {
      case 'code':
        return [
          `The user attached the selected editor text at ${formatSelection(selection)} in Code Viewer.`,
          'This is a current editor snapshot and may include unsaved edits. Attaching it does not save the file.',
          '',
          selection.text,
        ].join('\n')
      case 'changes':
        return [
          `The user attached unsaved changes to ${JSON.stringify(selection.path)} in Code Viewer.`,
          `Base revision (last read or saved): ${JSON.stringify(selection.revision)}.`,
          'This is a draft snapshot, not a disk save.',
          '',
          selection.patch,
        ].join('\n')
      case 'file':
        return `The user selected the file ${JSON.stringify(selection.path)} in Code Viewer.`
      case 'directory':
        return `The user selected the folder ${JSON.stringify(selection.path)} in Code Viewer.`
      default: {
        const exhaustive: never = selection
        return exhaustive
      }
    }
  }
  return `The user selected ${formatSelection(selection)} in Code Viewer.`
}
