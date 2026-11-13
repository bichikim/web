import {closePopover, panePopover, showPopover} from './pane-popover.js'
import {findText, offsetPosition, sourceOffset} from '../../../src/headless/index.ts'
/** Resolves the current symbol while retaining transient progress and result groups. */
export async function navigatePane(engine, navigation, context) {
  const current = context.document
  const pending = {
    kind: 'references',
    locations: [],
    navigation,
    point: context.point,
    region: 'code',
    status: 'loading',
  }
  showPopover(pending)
  engine.ui.invalidate('ui.render')
  try {
    const result = await context.request('code.navigate', {
      navigation,
      offset: sourceOffset(current.source, current.line, current.column),
      path: current.path,
      revision: current.revision,
      sources: context.documents
        .filter((entry) => entry.source !== entry.base)
        .map((entry) => ({path: entry.path, source: entry.source})),
    })
    if (panePopover() !== pending) {
      return
    }
    if (result.locations.length === 1) {
      closePopover()
      await context.open(result.locations[0])
      return
    }
    showPopover({...pending, locations: result.locations, navigation: result.kind, status: 'ready'})
    engine.ui.invalidate('ui.render')
  } catch (error) {
    if (panePopover() === pending) {
      showPopover({...pending, status: 'failed'})
      engine.ui.invalidate('ui.render')
    }
    throw error
  }
}

/** Validates a document location without changing the editor or draft. */
export function movePaneLine(document, line, column) {
  const lines = document.source.split(/\r\n|\n|\r/u)
  if (
    !Number.isInteger(line) ||
    line < 1 ||
    line > lines.length ||
    !Number.isInteger(column) ||
    column < 1 ||
    column > lines[line - 1].length + 1
  ) {
    throw new Error('파일 안의 줄·열을 입력하세요.')
  }
  return {...document, column, line}
}
/** Finds a cyclic text match and its logical source position. */
export function findPaneMatch(source, query, previous, direction) {
  const matches = findText(source, query)
  if (matches.length === 0) {
    return undefined
  }
  const index = (previous + direction + matches.length) % matches.length
  const position = offsetPosition(source, matches[index].start)
  return {column: position.character + 1, index, line: position.line + 1}
}
