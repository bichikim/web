import path from 'node:path'

export const isPathInsideDirectory = ({
  directoryPath,
  targetPath,
}: {
  readonly directoryPath: string
  readonly targetPath: string
}): boolean => {
  const resolvedDirectoryPath = path.resolve(directoryPath)
  const resolvedTargetPath = path.resolve(targetPath)
  const relativePath = path.relative(resolvedDirectoryPath, resolvedTargetPath)

  return (
    relativePath === '' ||
    (relativePath !== '..' &&
      !relativePath.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relativePath))
  )
}
