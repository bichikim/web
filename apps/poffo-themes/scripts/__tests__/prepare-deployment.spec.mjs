/** @vitest-environment node */
import {execFile} from 'node:child_process'
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {promisify} from 'node:util'
import {expect, test} from 'vitest'

const run = promisify(execFile)
const script = resolve('apps/poffo-themes/scripts/prepare-deployment.mjs')
const archive = 'window-light.poffotheme'

const createCatalog = async (onTestFinished) => {
  const root = await mkdtemp(join(tmpdir(), 'poffo-theme-catalog-'))
  onTestFinished(() => rm(root, {force: true, recursive: true}))
  const source = join(root, 'public')
  const target = join(root, 'output')
  const download = join(source, 'download', archive)
  await mkdir(join(source, 'download'), {recursive: true})
  await writeFile(join(source, 'index.html'), `<a href="/download/${archive}">Download</a>`)
  return {download, root, source, target}
}

test('should reject a truncated archive before creating a deployment artifact', async ({
  onTestFinished,
}) => {
  const {download, source, target} = await createCatalog(onTestFinished)
  await writeFile(download, Buffer.from('504b0304', 'hex'))

  await expect(run(process.execPath, [script, source, target])).rejects.toThrow(
    'Invalid theme archive',
  )
  await expect(readFile(join(target, 'config.json'))).rejects.toMatchObject({code: 'ENOENT'})
})

test('should keep a complete archive and its download headers in the deployment artifact', async ({
  onTestFinished,
}) => {
  const {download, root, source, target} = await createCatalog(onTestFinished)
  await writeFile(join(root, 'manifest.json'), '{}')
  await run('zip', ['-q', download, 'manifest.json'], {cwd: root})

  await run(process.execPath, [script, source, target])

  expect(await readFile(join(target, 'static', 'download', archive))).toEqual(
    await readFile(download),
  )
  const {routes} = JSON.parse(await readFile(join(target, 'config.json'), 'utf8'))
  const route = routes.find(
    ({src}) => src !== undefined && new RegExp(src).test(`/download/${archive}`),
  )
  expect(route.headers).toEqual({
    'Content-Disposition': `attachment; filename="${archive}"`,
    'Content-Type': 'application/zip',
  })
})
