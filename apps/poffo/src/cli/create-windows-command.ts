/** cmd.exe does not accept the verbatim paths returned by Windows canonicalization. */
export const createWindowsCommand = (executable: string): string => {
  const path = executable.replace(/^\\\\\?\\UNC\\/iu, '\\\\').replace(/^\\\\\?\\(?=[a-z]:\\)/iu, '')
  return `@echo off\r\n"${path.replaceAll('%', '%%')}" %*\r\n`
}
