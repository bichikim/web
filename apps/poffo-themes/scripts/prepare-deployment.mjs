import {execFile} from 'node:child_process'
import {cp, mkdir, readFile, writeFile} from 'node:fs/promises'
import {dirname, join, resolve} from 'node:path'
import {promisify} from 'node:util'

const run = promisify(execFile)
const [, , source = 'apps/poffo-themes/.output/public', target = '.vercel/output'] = process.argv
const homepage = await readFile(join(source, 'index.html'), 'utf8')
const slugs = new Set(
  Array.from(
    homepage.matchAll(/href="\/download\/(?<slug>[a-z0-9-]{1,80})\.poffotheme"/gu),
    ({groups}) => groups.slug,
  ),
)
if (slugs.size === 0) {
  throw new Error('The built theme catalog contains no downloads')
}

const routes = await Promise.all(
  [...slugs].map(async (slug) => {
    const filename = `${slug}.poffotheme`
    try {
      await run('unzip', ['-tqq', resolve(source, 'download', filename)])
    } catch (cause) {
      throw new Error(`Invalid theme archive: ${filename}`, {cause})
    }
    return {
      continue: true,
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': 'application/zip',
      },
      src: `^/download/${slug}\\.poffotheme$`,
    }
  }),
)

await mkdir(dirname(target), {recursive: true})
await mkdir(target)
await cp(source, join(target, 'static'), {recursive: true})
await writeFile(
  join(target, 'config.json'),
  `${JSON.stringify({routes: [...routes, {handle: 'filesystem'}], version: 3})}\n`,
)
