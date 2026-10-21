let hovered = {divider: false, tree: ''}
export const paneHover = () => hovered
/** Applies hover feedback only to the current divider or a matching displayed tree row. */
export function changePaneHover(element, data, window) {
  if (data?.kind !== 'hover') {
    return false
  }
  if (element === 'panel-divider' && typeof data.active === 'boolean') {
    hovered = {...hovered, divider: data.active}
    return true
  }
  if (element !== 'file-tree') {
    return false
  }
  const row =
    Number.isInteger(data.index) && data.index >= 0 && data.index < window.rows
      ? window.nodes[window.offset + data.index]
      : undefined
  if (row === undefined || (data.path !== '' && row.path !== data.path)) {
    return false
  }
  if (data.active === false || data.path === '') {
    if (hovered.tree === row.path) {
      hovered = {...hovered, tree: ''}
    }
    return true
  }
  hovered = {...hovered, tree: row.path}
  return true
}
