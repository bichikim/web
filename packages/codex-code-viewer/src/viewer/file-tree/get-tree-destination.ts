import type {FileTreeNode} from './types'

interface TreeFocus {
  action: 'focus'
  path: string
}
interface TreeToggle {
  action: 'toggle'
}
interface TreeStay {
  action: 'stay'
}
type TreeDestination = TreeFocus | TreeToggle | TreeStay
interface GetTreeDestinationOptions {
  expanded: boolean
  key: string
  node: FileTreeNode | undefined
  path: string
  paths: readonly string[]
}

/** Maps a tree navigation key to a focus destination or folder toggle. */
export const getTreeDestination = (options: GetTreeDestinationOptions): TreeDestination | null => {
  const index = options.paths.indexOf(options.path)
  let next: string | undefined
  switch (options.key) {
    case 'ArrowDown':
      next = options.paths[Math.min(index + 1, options.paths.length - 1)]
      break
    case 'ArrowUp':
      next = options.paths[Math.max(index - 1, 0)]
      break
    case 'Home':
      next = options.paths.at(0)
      break
    case 'End':
      next = options.paths.at(-1)
      break
    case 'ArrowRight':
      if (options.node?.kind === 'directory') {
        if (!options.expanded) {
          return {action: 'toggle'}
        }
        next = options.node.children[0]?.path
      }
      break
    case 'ArrowLeft':
      if (options.node?.kind === 'directory' && options.expanded) {
        return {action: 'toggle'}
      }
      next = options.path.split('/').slice(0, -1).join('/') || undefined
      break
    default:
      return null
  }
  return next === undefined ? {action: 'stay'} : {action: 'focus', path: next}
}
