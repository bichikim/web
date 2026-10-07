import type {FileTabUpdate, LocationRequest, TabLocationInput} from './types'

const readRequest = (value: unknown): LocationRequest => {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('path' in value) ||
    !('workspace' in value) ||
    typeof value.path !== 'string' ||
    typeof value.workspace !== 'string'
  ) {
    throw new Error('Invalid file location request.')
  }
  return {path: value.path, workspace: value.workspace}
}

const readPath = (path: string): string => {
  if (
    path.length === 0 ||
    path.includes('\0') ||
    path.includes('\\') ||
    path.split('/').some((part) => part === '..' || part === '.')
  ) {
    throw new Error('Invalid workspace file path.')
  }
  return path.replace(/\/+$/u, '')
}

/** Returns the native tab fields changed by same-workspace Code Viewer navigation. */
export const createTabLocation = ({
  tab,
  request,
  hostId,
  server,
  workspace,
}: TabLocationInput): FileTabUpdate => {
  const location = readRequest(request)
  const {content} = tab.props
  if (
    tab.tabType.kind !== 'mcp-extension' ||
    content.type !== 'file-viewer' ||
    content.view.tool.name !== 'code.file' ||
    content.view.hostId !== hostId ||
    content.view.server !== server ||
    hostId !== 'local' ||
    workspace === null
  ) {
    throw new Error('The current tab is not a local Code Viewer file tab.')
  }
  const root = readPath(workspace)
  if (!root.startsWith('/') || root.length === 0 || root !== readPath(location.workspace)) {
    throw new Error('File navigation cannot change the approved workspace.')
  }
  const target = readPath(location.path)
  const path = target.startsWith('/') ? target : `${root}/${target}`
  const initialPath = content.initialPath ?? content.path
  if (!path.startsWith(`${root}/`) || !initialPath.startsWith(`${root}/`)) {
    throw new Error('File navigation is outside the approved workspace.')
  }
  const title = path.slice(path.lastIndexOf('/') + 1)
  return {
    durableRoute:
      tab.durableRoute === undefined
        ? undefined
        : {...tab.durableRoute, params: {...tab.durableRoute.params, path}},
    props: {...tab.props, content: {...content, initialPath, path}, titleOverride: title},
    title,
    tooltip: path,
  }
}
