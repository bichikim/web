/** @vitest-environment node */
import {resolve} from 'node:path'
import {build, createServer, type Plugin} from 'vite'
import {expect, it} from 'vitest'
import {createServerBoundaryPlugin} from '../index'

const root = resolve(import.meta.dirname, 'fixture')
const directories = ['src/server/', resolve(root, 'private')]
const createConfig = (entry: string, folders: ReadonlyArray<string> = directories) => {
  const modules: Record<string, string> = {
    'bridge.ts': 'export {value} from "./src/server/value.ts"',
    'entry.ts': entry,
    'private/value.ts': 'export const value = 42',
    'src/server/nested/value.ts': 'export const value = 42',
    'src/server/value.ts': 'export const value = 42',
    'src/serverish/value.ts': 'export const value = 24',
  }
  const fixture: Plugin = {
    load(id) {
      return modules[id.slice(root.length + 1)] ?? null
    },
    name: 'fixture',
    resolveId(id, importer) {
      if (id === 'entry') {
        return resolve(root, 'entry.ts')
      }
      if (id.startsWith('./')) {
        return resolve(importer === undefined ? root : resolve(importer, '..'), id)
      }
      return null
    },
  }
  return {
    configFile: false as const,
    logLevel: 'silent' as const,
    plugins: [fixture, createServerBoundaryPlugin({directories: folders})],
    resolve: {alias: {'private-value': resolve(root, 'src/server/value.ts')}},
    root,
  }
}

const runBuild = (entry: string, server = false) =>
  build({
    ...createConfig(entry),
    build: {minify: false, rolldownOptions: {input: 'entry'}, ssr: server, write: false},
  })

it.each([
  'import {value} from "./src/server/nested/value.ts"; console.log(value)',
  'import {value} from "private-value"; console.log(value)',
  'import {value} from "./bridge.ts"; console.log(value)',
  'import("./src/server/value.ts").then(console.log)',
  'import "./src/server/value.ts"',
  'import {value} from "./private/value.ts"; console.log(value)',
])('should reject a client dependency: %s', async (entry) => {
  await expect(runBuild(entry)).rejects.toThrow('Server directory module reached the client')
})

it.each([{folders: []}, {folders: ['private']}])(
  'should allow server-named folders when not configured: %j',
  async ({folders}) => {
    await expect(
      build({
        ...createConfig('import {value} from "./src/server/value.ts"; console.log(value)', folders),
        build: {rolldownOptions: {input: 'entry'}, write: false},
      }),
    ).resolves.toBeDefined()
  },
)

it('should reject client transforms and allow server transforms during development', async () => {
  const server = await createServer({
    ...createConfig(''),
    server: {hmr: false, middlewareMode: true, watch: null},
  })
  try {
    const filename = resolve(root, 'src/server/value.ts')
    await expect(server.environments.client.transformRequest(filename)).rejects.toThrow(
      `Server directory module reached the client: ${filename}`,
    )
    const result = await server.environments.ssr.transformRequest(filename)
    expect(result?.code).toContain('42')
  } finally {
    await server.close()
  }
})

it('should allow server builds', async () => {
  await expect(runBuild('export {value} from "./src/server/value.ts"', true)).resolves.toBeDefined()
})

it('should allow similarly named sibling directories', async () => {
  await expect(
    runBuild('import {value} from "./src/serverish/value.ts"; console.log(value)'),
  ).resolves.toBeDefined()
})

it('should allow erased type imports', async () => {
  await expect(
    runBuild('import type {value} from "./src/server/value.ts"; console.log(1)'),
  ).resolves.toBeDefined()
})
