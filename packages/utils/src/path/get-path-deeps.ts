import {createJoinUrl} from 'src/path/join-url'

export const createGetPathDeeps = (separator: string = '/') => {
  const joinUrl = createJoinUrl(separator)
  return (path: string) => joinUrl(path).split(separator).length - 1
}
export const getPathDeeps = createGetPathDeeps()
