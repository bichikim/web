import {fileURLToPath} from 'node:url'

/** Resolves the bundled TypeScript executable for the current desktop host. */
export const resolveNativeBinary = (): string => {
  const binary = process.platform === 'win32' ? 'tsc.exe' : 'tsc'
  const directory = import.meta.url.endsWith('.ts') ? '../../../dist/' : './'
  return fileURLToPath(
    new URL(
      `${directory}typescript/${process.platform}-${process.arch}/${binary}`,
      import.meta.url,
    ),
  )
}
