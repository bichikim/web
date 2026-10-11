/** @vitest-environment node */
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {syncPluginVersion} from '../sync-plugin-version'

describe('syncPluginVersion', () => {
  let root: string
  let pluginPath: string
  let marketplacePath: string
  const plugin = {
    interface: {displayName: 'File Viewer'},
    mcpServers: './.mcp.json',
    name: 'file-viewer',
    version: '1.0.0',
  }
  const entry = {
    name: 'file-viewer',
    policy: {authentication: 'ON_INSTALL', installation: 'AVAILABLE'},
    source: {
      package: '@example/file-viewer',
      registry: 'https://registry.npmjs.org',
      source: 'npm',
      version: '1.0.0',
    },
  }
  const catalog = {
    interface: {displayName: 'Example Plugins'},
    name: 'example-plugins',
    plugins: [entry, {name: 'another-plugin', source: './another-plugin'}],
  }

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'plugin-version-'))
    pluginPath = join(root, '.codex-plugin/plugin.json')
    marketplacePath = join(root, 'marketplace.json')
    await mkdir(join(root, '.codex-plugin'))
    await writeFile(pluginPath, JSON.stringify(plugin))
    await writeFile(marketplacePath, JSON.stringify(catalog))
  })
  afterEach(async () => {
    await rm(root, {force: true, recursive: true})
  })

  it.each(['2.3.4', '3.0.0-rc.1'])(
    'should propagate package version %s without changing other metadata',
    async (version) => {
      await writeFile(
        join(root, 'package.json'),
        JSON.stringify({name: '@example/file-viewer', version}),
      )
      await syncPluginVersion({marketplacePath, packageRoot: root})
      expect(JSON.parse(await readFile(pluginPath, 'utf8'))).toEqual({...plugin, version})
      expect(JSON.parse(await readFile(marketplacePath, 'utf8'))).toEqual({
        ...catalog,
        plugins: [{...entry, source: {...entry.source, version}}, catalog.plugins[1]],
      })
    },
  )

  it('should leave both outputs untouched when the npm entry identifies another package', async () => {
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({name: '@example/other-package', version: '2.0.0'}),
    )
    await expect(syncPluginVersion({marketplacePath, packageRoot: root})).rejects.toThrow()
    expect(JSON.parse(await readFile(pluginPath, 'utf8'))).toEqual(plugin)
    expect(JSON.parse(await readFile(marketplacePath, 'utf8'))).toEqual(catalog)
  })

  it('should reject a missing marketplace entry before updating the plugin manifest', async () => {
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({name: '@example/file-viewer', version: '2.0.0'}),
    )
    await writeFile(marketplacePath, JSON.stringify({...catalog, plugins: []}))
    await expect(syncPluginVersion({marketplacePath, packageRoot: root})).rejects.toThrow(
      'Missing marketplace entry: file-viewer',
    )
    expect(JSON.parse(await readFile(pluginPath, 'utf8'))).toEqual(plugin)
  })
})
