import {createJoinUrl} from 'src/path/join-url'

/**
 * @deprecated
 */
export const createGetPathDeeps = (separator: string = '/') => {
  const joinUrl = createJoinUrl(separator)

  return (path: string) => joinUrl(path).split(separator).length - 1
}

/**
 * @deprecated
 */
export const getPathDeeps = createGetPathDeeps()
