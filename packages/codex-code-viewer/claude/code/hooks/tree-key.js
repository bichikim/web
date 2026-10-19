const treeShortcut = (event) => {
  if (event.ctrl || event.meta) {
    if (event.ctrl && event.shift && ['.', '>'].includes(event.key)) {
      return {kind: 'menu'}
    }
    const action = new Map([
      ['c', 'copy'],
      ['x', 'cut'],
      ['v', 'paste'],
    ]).get(event.key.toLowerCase())
    return action === undefined ? undefined : {action, kind: 'action'}
  }
  if (event.key === 'f10' && event.shift) {
    return {kind: 'menu'}
  }
  const action = new Map([
    ['f2', 'rename'],
    ['delete', 'remove'],
  ]).get(event.key.toLowerCase())
  return action === undefined ? undefined : {action, kind: 'action'}
}
export function treeKey(props, cursor, event) {
  const {key} = event
  const row = props.rows[cursor]
  if (row === undefined) {
    return undefined
  }
  const shortcut = treeShortcut(event)
  if (shortcut !== undefined || event.ctrl || event.meta) {
    return shortcut === undefined ? undefined : {...shortcut, index: cursor}
  }
  switch (key) {
    case 'up':
    case 'down':
    case 'home':
    case 'end':
    case 'pageup':
    case 'pagedown':
      return {direction: key, index: cursor, kind: 'move'}
    case 'return':
      return {index: cursor, kind: 'activate'}
    case 'm':
      return {index: cursor, kind: 'menu'}
    case 'right':
      return row.kind === 'directory' && !row.expanded
        ? {index: cursor, kind: 'activate'}
        : undefined
    case 'left': {
      if (row.kind === 'directory' && row.expanded) {
        return {index: cursor, kind: 'activate'}
      }
      return {direction: 'parent', index: cursor, kind: 'move'}
    }
    default:
      return undefined
  }
}
