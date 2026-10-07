import type {ViewerContext} from './types'
import {formatSelection} from './format-selection'

/** Formats a whole file, folder or code range as pending chat context. */
export const formatContext = (selection: ViewerContext): string => {
  if ('kind' in selection) {
    const kind = selection.kind === 'file' ? 'file' : 'folder'
    return `The user selected the ${kind} ${JSON.stringify(selection.path)} in Code Viewer.`
  }
  return `The user selected ${formatSelection(selection)} in Code Viewer.`
}
