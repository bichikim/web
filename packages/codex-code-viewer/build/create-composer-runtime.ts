import {execFile} from 'node:child_process'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {dirname, join} from 'node:path'

interface ComposerRuntimeOptions {
  readonly source: string
  readonly output: string
  readonly platform: string
  readonly version: string
}
const run = (file: string, args: readonly string[]): Promise<void> =>
  new Promise((resolve, reject) => {
    execFile(file, args, {encoding: 'utf8'}, (error) => {
      if (error === null) {
        resolve()
      } else {
        reject(error)
      }
    })
  })

/** Builds a separately identified macOS Accessibility helper without external dependencies. */
export const createComposerRuntime = async (
  options: ComposerRuntimeOptions,
): Promise<string | undefined> => {
  if (options.platform !== 'darwin') {
    return undefined
  }
  const application = join(options.output, 'Code Viewer Attachment.app')
  const contents = join(application, 'Contents')
  await mkdir(join(contents, 'MacOS'), {recursive: true})
  const template = await readFile(join(dirname(options.source), 'Info.plist'), 'utf8')
  await writeFile(join(contents, 'Info.plist'), template.replaceAll('__VERSION__', options.version))
  await run('/usr/bin/xcrun', [
    'swiftc',
    '-O',
    options.source,
    '-o',
    join(contents, 'MacOS/composer'),
  ])
  await run('/usr/bin/codesign', ['--force', '--sign', '-', application])
  return application
}
