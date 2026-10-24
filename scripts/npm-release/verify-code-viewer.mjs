/* oxlint-disable eslint-js/camelcase -- npm configuration environment variables use underscores. */
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {execFileSync, spawn} from 'node:child_process'
import {once} from 'node:events'
import {constants} from 'node:fs'
import {access, mkdir, mkdtemp, readFile, realpath, rm, stat, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import {compareFiles} from './code-viewer/compare-files.mjs'
import {startRegistry} from './code-viewer/start-registry.mjs'
import {verifyRuntime} from './code-viewer/verify-runtime.mjs'

const arguments_ = process.argv.slice(2)
assert.ok(
  arguments_.length >= 1 && arguments_.length <= 2,
  'Usage: node scripts/npm-release/verify-code-viewer.mjs <archive.tgz> [report-directory]',
)
assert.ok(
  process.platform !== 'win32',
  'This installation fixture requires macOS or Linux (tar, openssl, npx and codex).',
)
const repository = fileURLToPath(new URL('../..', import.meta.url))
const packageRoot = join(repository, 'packages/codex-code-viewer')
const archive = resolve(arguments_[0])
const output = resolve(arguments_[1] ?? join(repository, 'node_modules/.cache/code-viewer-install'))
await mkdir(output, {recursive: true})
const bytes = await readFile(archive)
const MAX_PLUGIN_BYTES = 52428800
assert.ok(
  bytes.length <= MAX_PLUGIN_BYTES,
  `Code Viewer archive is ${bytes.length} bytes; Codex allows at most ${MAX_PLUGIN_BYTES} bytes.`,
)
const root = await realpath(await mkdtemp(join(tmpdir(), 'viewer-tarball-')))
/** @param {Buffer} value */
const sha256 = (value) => createHash('sha256').update(value).digest('hex')
/** @type {import('./code-viewer/types.js').VerificationReceipt} */
const receipt = {
  archive,
  bytes: bytes.length,
  checks: [],
  node: process.version,
  sha256: sha256(bytes),
}
let registry
let log = ''
try {
  const extracted = join(root, 'extracted')
  await mkdir(extracted)
  execFileSync('tar', ['-xzf', archive, '-C', extracted])
  const packed = join(extracted, 'package')
  const manifest = JSON.parse(await readFile(join(packed, 'package.json'), 'utf8'))
  registry = await startRegistry({bytes, manifest, root})
  const codex = process.env.CODEX_BINARY ?? 'codex'
  receipt.codex = execFileSync(codex, ['--version'], {encoding: 'utf8'}).trim()
  receipt.version = manifest.version
  const home = join(root, 'codex-home')
  const working = join(root, 'working')
  const npmConfig = join(root, 'npmrc')
  await mkdir(home)
  await mkdir(working)
  await writeFile(
    npmConfig,
    `@winter-love:registry=${registry.url}\ncafile=${registry.certificate}\naudit=false\nfund=false\n`,
  )
  await writeFile(
    join(home, 'config.toml'),
    [
      '[marketplaces.winter-love-code-viewer]',
      'source_type = "local"',
      'source = "/missing/development/dist"',
      '',
      '[marketplaces.unrelated-broken]',
      'source_type = "local"',
      'source = "/missing/unrelated"',
      '',
    ].join('\n'),
  )
  const inherited = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.toLowerCase().startsWith('npm_config_')),
  )
  const globalConfig = join(root, 'global-npmrc')
  await writeFile(globalConfig, '')
  const environment = {
    ...inherited,
    CODEX_BINARY: codex,
    CODEX_HOME: home,
    NODE_PATH: '',
    npm_config_cache: join(root, 'npm-cache'),
    npm_config_globalconfig: globalConfig,
    npm_config_userconfig: npmConfig,
    PATH: `${dirname(process.execPath)}:${process.env.PATH}`,
  }
  /** @param {string} label */
  const install = async (label, env = environment, expectedCode = 0) => {
    process.stdout.write(`${label}: npx --yes --package=${archive} codex-code-viewer install\n`)
    const child = spawn('npx', ['--yes', `--package=${archive}`, 'codex-code-viewer', 'install'], {
      cwd: working,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let run = ''
    /** @param {string} chunk */
    const onOutput = (chunk) => {
      run += chunk
      log += chunk
      process.stdout.write(chunk)
    }
    child.stdout.setEncoding('utf8').on('data', onOutput)
    child.stderr.setEncoding('utf8').on('data', onOutput)
    const [code] = await once(child, 'close')
    assert.equal(code, expectedCode, run)
    if (expectedCode !== 0) {
      assert.ok(run.includes('[3/4]'), 'Failure did not reach package installation')
      assert.ok(run.includes('Restoring installation settings…'))
      assert.ok(run.includes('Code Viewer installation failed:'))
      return
    }
    for (const step of [
      '[1/4]',
      '[2/4]',
      '[3/4]',
      '[4/4]',
      `Code Viewer ${manifest.version} installed.`,
    ]) {
      assert.ok(run.includes(step), step)
    }
    assert.ok(!run.includes('"pluginId"'), 'CLI JSON leaked into progress output')
  }
  assert.equal(manifest.name, '@winter-love/codex-code-viewer')
  assert.equal(
    JSON.parse(await readFile(join(packed, '.codex-plugin/plugin.json'), 'utf8')).version,
    manifest.version,
  )
  await Promise.all(
    [
      '.mcp.json',
      'assets/icon.svg',
      'dist/server.js',
      'dist/navigation-worker.js',
      'dist/app.html',
      'dist/install.js',
      'dist/lib.es5.d.ts',
      'dist/python/langserver.index.js',
      'dist/THIRD_PARTY_LICENSES.md',
    ].map(async (file) => {
      assert.ok((await stat(join(packed, file))).size > 0, file)
    }),
  )
  await access(join(packed, 'dist/install.js'), constants.X_OK)
  await install('Fresh installation')
  assert.ok(
    registry.requests.some((request) => request.path.endsWith('.tgz')),
    'Codex never downloaded this tarball from the fixture registry',
  )
  const installed = join(
    home,
    'plugins/cache/winter-love-code-viewer-npm/codex-code-viewer',
    manifest.version,
  )
  receipt.filesCompared = await compareFiles({installed, packed})
  receipt.installed = installed
  receipt.checks.push(
    'fresh npx tarball installation with stale marketplaces',
    'all installed file SHA-256 hashes match tarball',
  )
  console.log(`Verified all ${receipt.filesCompared} installed file hashes against tarball.`)
  await install('Repeated installation')
  receipt.checks.push('repeat npx tarball installation')
  const listed = JSON.parse(
    execFileSync(
      codex,
      ['plugin', 'list', '--json', '--marketplace', 'winter-love-code-viewer-npm'],
      {cwd: working, encoding: 'utf8', env: environment},
    ),
  )
  assert.ok(
    listed.installed.some(
      (/** @type {{version: string, enabled: boolean}} */ plugin) =>
        plugin.version === manifest.version && plugin.enabled,
    ),
  )
  assert.ok(
    (await readFile(join(home, 'config.toml'), 'utf8')).includes('[marketplaces.unrelated-broken]'),
  )
  const configuration = await readFile(join(home, 'config.toml'), 'utf8')
  assert.ok(!configuration.includes('[marketplaces.winter-love-code-viewer]'))
  execFileSync(codex, ['plugin', 'list', '--json', '--marketplace', 'winter-love-code-viewer'], {
    env: environment,
  })
  receipt.checks.push(
    'missing legacy development marketplace unregistered; unrelated registration retained',
  )
  registry.setDownloadsAvailable(false)
  /** @param {boolean} previous */
  const verifyFailure = async (previous) => {
    const failureHome = join(root, previous ? 'previous-home' : 'failure-home')
    await mkdir(failureHome)
    const previousRoot = join(failureHome, 'marketplace-sources/winter-love-code-viewer-npm')
    const previousCatalog = JSON.stringify({name: 'winter-love-code-viewer-npm', plugins: []})
    if (previous) {
      await mkdir(join(previousRoot, '.agents/plugins'), {recursive: true})
      await writeFile(join(previousRoot, '.agents/plugins/marketplace.json'), previousCatalog)
      execFileSync(codex, ['plugin', 'marketplace', 'add', previousRoot, '--json'], {
        env: {...environment, CODEX_HOME: failureHome},
      })
    }
    const failureEnv = {
      ...environment,
      CODEX_HOME: failureHome,
      npm_config_cache: join(failureHome, 'npm-cache'),
    }
    await install(
      previous ? 'Failure with previous local registration' : 'Failure with no prior registration',
      failureEnv,
      1,
    )
    const config = await readFile(join(failureHome, 'config.toml'), 'utf8')
    if (previous) {
      assert.ok(config.includes(previousRoot))
      assert.equal(
        await readFile(join(previousRoot, '.agents/plugins/marketplace.json'), 'utf8'),
        previousCatalog,
      )
    } else {
      assert.ok(!config.includes('[marketplaces.winter-love-code-viewer-npm]'))
    }
    execFileSync(
      codex,
      ['plugin', 'list', '--json', '--marketplace', 'winter-love-code-viewer-npm'],
      {env: failureEnv},
    )
  }
  await verifyFailure(false)
  await verifyFailure(true)
  registry.setDownloadsAvailable(true)
  receipt.checks.push(
    'failed fresh install unregisters new marketplace',
    'failed replacement restores prior local marketplace registration',
  )
  const runtime = await verifyRuntime({home, installed, packageRoot, packed, root})
  Object.assign(receipt, runtime)
  receipt.checks.push(
    'installed server MCP handshake and viewer resource',
    'installed navigation worker TypeScript references',
  )
  receipt.passed = true
  console.log(
    `Verified Code Viewer ${manifest.version}: ${receipt.filesCompared} file hashes; ` +
      `${runtime.tools.length} MCP tools; ${runtime.navigation.length} references.`,
  )
} catch (error) {
  receipt.passed = false
  receipt.error = error instanceof Error ? error.stack : String(error)
  process.exitCode = 1
  console.error(error)
} finally {
  receipt.requests = registry?.requests ?? []
  try {
    await registry?.close()
  } finally {
    await writeFile(join(output, 'installation.log'), log)
    await writeFile(join(output, 'verification.json'), `${JSON.stringify(receipt, null, 2)}\n`)
    await rm(root, {force: true, recursive: true})
    console.log('Receipt:', join(output, 'verification.json'))
  }
}
