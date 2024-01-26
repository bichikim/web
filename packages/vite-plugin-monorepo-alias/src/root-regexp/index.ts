import {splitWindowRoot} from '../split-window-root'
import {changePathDelimiter} from '../change-path-delimiter'
import {createTrimPath} from '../trim-path'

const MAX_TRIM_PATH = 500
const trimPathRight = createTrimPath('/', MAX_TRIM_PATH, 'right')
export const createRootRegexp = (root: string, osPathDelimiter: string) => {
  const {root: windowRoot, restPath: purePath} = splitWindowRoot(root)

  const rootPath = changePathDelimiter(purePath, osPathDelimiter, '/')

  return RegExp(`^${windowRoot ?? ''}${trimPathRight(rootPath)}`, 'u')
}
