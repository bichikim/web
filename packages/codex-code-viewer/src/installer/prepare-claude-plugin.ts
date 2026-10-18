import {chmod, mkdir, writeFile} from 'node:fs/promises'
import {dirname, isAbsolute, join} from 'node:path'
import {strFromU8, unzipSync} from 'fflate'
import {z} from 'zod'

interface PrepareClaudePluginOptions {
  readonly archive: Uint8Array
  readonly root: string
  readonly version: string
}

/** Extracts this version's packaged Claude plugin, rejecting paths outside its destination. */
export const prepareClaudePlugin = async (options: PrepareClaudePluginOptions): Promise<void> => {
  const entries = unzipSync(options.archive)
  const files = Object.entries(entries).filter(([name]) => !name.endsWith('/'))
  if (
    Object.keys(entries).some(
      (name) =>
        isAbsolute(name) ||
        name.split('/').includes('..') ||
        name.includes('\\') ||
        name.includes(':'),
    )
  ) {
    throw new Error('Claude 패키지에 잘못된 경로가 있습니다.')
  }
  const content = entries['.claude-plugin/plugin.json']
  const manifest = z
    .object({name: z.literal('code-viewer'), version: z.string()})
    .parse(JSON.parse(content === undefined ? '{}' : strFromU8(content)))
  if (manifest.version !== options.version) {
    throw new Error('Claude 패키지 버전이 설치기와 다릅니다.')
  }
  const executables = [
    'runtime/node',
    'runtime/Code Viewer Attachment.app/Contents/MacOS/composer',
    ...files.map(([name]) => name).filter((name) => name.endsWith('/rust-analyzer')),
  ]
  const required = [
    'dist/browser.js',
    'dist/reveal.js',
    'hooks/hooks.json',
    'hooks/register.js',
    ...executables,
  ]
  if (required.some((name) => entries[name] === undefined)) {
    throw new Error('Claude 패키지의 실행 파일이 누락됐습니다.')
  }
  await Promise.all(
    files.map(async ([name, bytes]) => {
      const path = join(options.root, name)
      await mkdir(dirname(path), {recursive: true})
      await writeFile(path, bytes)
    }),
  )
  const executableMode = 0o755
  await Promise.all(executables.map((name) => chmod(join(options.root, name), executableMode)))
}
