/** Recognizes workspace-opening addresses across supported desktop hosts. */
export const isAbsolutePath = (path: string): boolean => /^(?:\/|[a-z]:[\\/]|\\\\)/iu.test(path)
