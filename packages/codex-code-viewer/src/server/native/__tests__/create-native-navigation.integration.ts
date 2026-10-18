import {mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join} from 'node:path'
import {describe, expect, it} from 'vitest'
import {createNativeNavigation} from '../create-native-navigation'
import {resolveNativeBinary} from '../resolve-native-binary'

const positions = (file: string, text: string) =>
  [...text.matchAll(/greet|hello/gu)].map((match) => JSON.stringify([file, 1, match.index + 1]))
const keys = (locations: readonly {path: string; line: number; column: number}[]) =>
  locations.map(({path, line, column}) => JSON.stringify([path, line, column])).sort()

describe('createNativeNavigation', () => {
  it.each(['ts', 'mjs'])(
    'should stream verified import usages before the first native definition for %s',
    async (extension) => {
      const root = realpathSync(mkdtempSync(join(tmpdir(), 'native-direct-')))
      const source = 'export const greet = () => 1'
      const consumer =
        `import {greet as hello} from '../core.${extension}';` +
        ' hello(); function shadow(hello) { hello() }'
      mkdirSync(join(root, 'outside'))
      writeFileSync(
        join(root, 'tsconfig.json'),
        '{"compilerOptions":{"noLib":true,"types":[],"allowJs":true}}',
      )
      writeFileSync(join(root, `core.${extension}`), source)
      writeFileSync(join(root, `other.${extension}`), source)
      writeFileSync(join(root, `outside/use.${extension}`), consumer)
      writeFileSync(
        join(root, `outside/unrelated.${extension}`),
        consumer.replace('../core.', '../other.'),
      )
      const client = createNativeNavigation({
        binary: await resolveNativeBinary(),
        documents: [],
        receive: () => undefined,
        root,
      })
      const early: {path: string; line: number; column: number}[] = []
      const query = {
        file: `core.${extension}`,
        kind: 'definition',
        offset: source.indexOf('greet'),
        source,
      } as const
      try {
        const definitions = await client.query({
          ...query,
          receiveOwnReferences: (found) => {
            expect(client.diagnostics().stages.initialDefinition).toBeUndefined()
            early.push(...found)
          },
        })
        expect(keys(definitions)).toEqual([JSON.stringify([`core.${extension}`, 1, 14])])
        expect(keys(early)).toEqual(
          [
            JSON.stringify([`outside/use.${extension}`, 1, consumer.indexOf('hello();') + 1]),
            JSON.stringify([`outside/use.${extension}`, 1, 9]),
          ].sort(),
        )
        const expected = [
          JSON.stringify([`outside/use.${extension}`, 1, 9]),
          JSON.stringify([`outside/use.${extension}`, 1, 18]),
          JSON.stringify([`outside/use.${extension}`, 1, consumer.indexOf('hello();') + 1]),
        ].sort()
        const batches: typeof early = []
        expect(
          keys(
            await client.query({
              ...query,
              kind: 'references',
              receive: (found) => batches.push(...found),
            }),
          ),
        ).toEqual(expected)
        expect(keys(batches).every((key) => expected.includes(key))).toBe(true)
        expect(keys(await client.query({...query, kind: 'references'}))).toEqual(expected)
      } finally {
        await client.dispose()
        rmSync(root, {force: true, recursive: true})
      }
    },
  )

  it('should retain nested project aliases through batch preparation and configuration changes', async () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'native-batch-projects-')))
    const source = 'export function greet() {}'
    const consumer = "import {greet as hello} from '#core'; hello()"
    mkdirSync(join(root, 'consumer'))
    writeFileSync(join(root, 'tsconfig.json'), '{"compilerOptions":{"noLib":true,"types":[]}}')
    writeFileSync(join(root, 'core.ts'), source)
    writeFileSync(join(root, 'other.ts'), source)
    writeFileSync(join(root, 'consumer/use.ts'), consumer)
    const configuration = (target: string) =>
      JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          module: 'esnext',
          moduleResolution: 'bundler',
          noLib: true,
          paths: {'#core': [`../${target}.ts`]},
          types: [],
        },
        files: ['use.ts'],
      })
    writeFileSync(join(root, 'consumer/tsconfig.json'), configuration('core'))
    const client = createNativeNavigation({
      binary: await resolveNativeBinary(),
      documents: [],
      receive: () => undefined,
      root,
    })
    const query = {
      file: 'core.ts',
      kind: 'references',
      offset: source.indexOf('greet'),
      source,
    } as const
    const expected = positions('consumer/use.ts', consumer).sort()
    try {
      expect(keys(await client.query(query))).toEqual(expected)
      expect(client.diagnostics().preparation).toEqual({batches: 1, fallback: false, files: 1})
      expect(client.diagnostics().opened).toBe(1)
      writeFileSync(join(root, 'consumer/tsconfig.json'), configuration('other'))
      expect(keys(await client.query(query))).toEqual([])
      expect(keys(await client.query({...query, file: 'other.ts'}))).toEqual(expected)
    } finally {
      await client.dispose()
      rmSync(root, {force: true, recursive: true})
    }
  })

  it('should initialize without discovering files and retain complete results afterward', async () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'native-initialize-')))
    const source = 'export function greet() {}'
    const consumer = "import {greet as hello} from './core'; hello()"
    writeFileSync(join(root, 'tsconfig.json'), '{"compilerOptions":{"noLib":true,"types":[]}}')
    writeFileSync(join(root, 'core.ts'), source)
    writeFileSync(join(root, 'use.ts'), consumer)
    const client = createNativeNavigation({
      binary: await resolveNativeBinary(),
      documents: [],
      receive: () => undefined,
      root,
    })
    try {
      expect(await client.initialize()).toBe(true)
      expect(client.diagnostics().scope).toBe(0)
      expect(
        keys(
          await client.query({
            file: 'core.ts',
            kind: 'references',
            offset: source.indexOf('greet'),
            source,
          }),
        ),
      ).toEqual(positions('use.ts', consumer).sort())
    } finally {
      await client.dispose()
      expect(await client.initialize()).toBe(false)
      rmSync(root, {force: true, recursive: true})
    }
  })
  it('should report an unavailable initial session through the subsequent lookup', async () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'native-initialize-missing-')))
    const source = 'export function greet() {}'
    writeFileSync(join(root, 'core.ts'), source)
    const client = createNativeNavigation({
      binary: join(root, 'unavailable'),
      documents: [],
      receive: () => undefined,
      root,
    })
    try {
      expect(await client.initialize()).toBe(false)
      await expect(
        client.query({
          file: 'core.ts',
          kind: 'definition',
          offset: source.indexOf('greet'),
          source,
        }),
      ).rejects.toThrow()
    } finally {
      await client.dispose()
      rmSync(root, {force: true, recursive: true})
    }
  })

  it.each(['greet', 'publicName'])(
    'should connect the CommonJS %s export value and exclude an unrelated module',
    async (exported) => {
      const root = realpathSync(mkdtempSync(join(tmpdir(), 'native-exports-')))
      const source = `function greet() {}\nmodule.exports = {${exported === 'greet' ? 'greet' : 'publicName: greet'}}\n`
      const consumer = `const {${exported}: hello} = require('./core.cjs');\nhello()\n`
      writeFileSync(
        join(root, 'tsconfig.json'),
        '{"compilerOptions":{"noLib":true,"types":[],"allowJs":true}}',
      )
      writeFileSync(join(root, 'core.cjs'), source)
      writeFileSync(join(root, 'other.cjs'), source)
      writeFileSync(join(root, 'consumer.cjs'), consumer)
      writeFileSync(join(root, 'unrelated.cjs'), consumer.replace('./core.cjs', './other.cjs'))
      const client = createNativeNavigation({
        binary: await resolveNativeBinary(),
        documents: [],
        receive: () => undefined,
        root,
      })
      const query = {
        file: 'core.cjs',
        kind: 'references',
        offset: source.indexOf('greet'),
        source,
      } as const
      const property = consumer.indexOf(exported) + 1
      const local = consumer.indexOf('hello') + 1
      const expected = [
        JSON.stringify(['consumer.cjs', 1, property]),
        JSON.stringify(['consumer.cjs', 1, local]),
        JSON.stringify(['consumer.cjs', 2, 1]),
        JSON.stringify(['core.cjs', 2, source.lastIndexOf('greet') - source.indexOf('\n')]),
      ].sort()
      try {
        expect(keys(await client.query(query))).toEqual(expected)
        expect(keys(await client.query(query))).toEqual(expected)
      } finally {
        await client.dispose()
        rmSync(root, {force: true, recursive: true})
      }
    },
  )
  it('should rebuild CommonJS linking for closed drafts and restore saved aliases afterward', async () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'native-drafts-')))
    const source = 'export const greet = () => 1'
    const consumer = "const {greet: hello} = require('./core'); hello()"
    writeFileSync(
      join(root, 'tsconfig.json'),
      '{"compilerOptions":{"noLib":true,"types":[],"allowJs":true}}',
    )
    writeFileSync(join(root, 'core.ts'), source)
    writeFileSync(join(root, 'other.ts'), 'export const other = () => 2')
    writeFileSync(join(root, 'consumer.cjs'), consumer)
    const client = createNativeNavigation({
      binary: await resolveNativeBinary(),
      documents: [],
      receive: () => undefined,
      root,
    })
    const query = {
      file: 'core.ts',
      kind: 'references',
      offset: source.indexOf('greet'),
      source,
    } as const
    try {
      expect(keys(await client.query(query))).toEqual(positions('consumer.cjs', consumer).sort())
      const sources = new Map([
        [join(root, 'consumer.cjs'), "const {other: different} = require('./other'); different()"],
      ])
      expect(await client.query({...query, sources})).toEqual([])
      expect(await client.query({...query, sources})).toEqual([])
      expect(keys(await client.query(query))).toEqual(positions('consumer.cjs', consumer).sort())
    } finally {
      await client.dispose()
      rmSync(root, {force: true, recursive: true})
    }
  })

  it('should cancel a foreground lookup during preparation and retain complete results for retry', async () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'native-cancel-')))
    const source = 'export const greet = () => 1'
    writeFileSync(
      join(root, 'tsconfig.json'),
      '{"compilerOptions":{"noLib":true,"types":[],"allowJs":true}}',
    )
    writeFileSync(join(root, 'core.ts'), source)
    const consumer = "const {greet: hello} = require('./core'); hello()"
    const files = Array.from({length: 32}, (_, index) => `consumer-${index}.cjs`)
    files.forEach((file) => writeFileSync(join(root, file), consumer))
    const client = createNativeNavigation({
      binary: await resolveNativeBinary(),
      documents: [],
      receive: () => undefined,
      root,
    })
    const early = "import {greet as hello} from './core'; hello()"
    writeFileSync(join(root, 'early.ts'), early)
    const controller = new AbortController()
    const query = {
      file: 'core.ts',
      kind: 'references',
      offset: source.indexOf('greet'),
      source,
    } as const
    try {
      const release = client.prioritize()
      const warming = client.warm()
      await expect(
        client.query({...query, receive: () => controller.abort(), signal: controller.signal}),
      ).rejects.toThrow()
      expect(controller.signal.aborted).toBe(true)
      release()
      await warming
      const expected = [
        ...files.flatMap((file) => positions(file, consumer)),
        ...positions('early.ts', early),
      ].sort()
      expect(keys(await client.query(query))).toEqual(expected)
    } finally {
      await client.dispose()
      rmSync(root, {force: true, recursive: true})
    }
  })
  it('should retain aliases outside the initial project when warmup completes during a query', async () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'native-overlap-')))
    const source = 'export function greet() {}'
    const covered = "import {greet as hello} from '@public'; hello()"
    const outside = "import {greet as hello} from '../core/entry'; hello()"
    const files = {
      'apps/covered.ts': covered,
      'apps/member.ts': "import {greet as hello} from '@public'; hello()",
      'apps/tsconfig.json': JSON.stringify({
        compilerOptions: {paths: {'@public': ['../other/entry.ts']}},
        extends: '../tsconfig.json',
        include: ['member.ts'],
      }),
      'core/entry.ts': source,
      'core/tsconfig.json': JSON.stringify({extends: '../tsconfig.json', include: ['entry.ts']}),
      'entry.ts': 'export {}',
      'loose/consumer.ts': outside,
      'other/entry.ts': source,
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          module: 'esnext',
          moduleResolution: 'bundler',
          noLib: true,
          paths: {'@public': ['./core/entry.ts']},
          types: [],
        },
        include: ['entry.ts', 'apps/covered.ts'],
      }),
    }
    Object.entries(files).forEach(([file, text]) => {
      mkdirSync(dirname(join(root, file)), {recursive: true})
      writeFileSync(join(root, file), text)
    })
    const client = createNativeNavigation({
      binary: await resolveNativeBinary(),
      documents: [],
      receive: () => undefined,
      root,
    })
    const expected = [
      ...positions('apps/covered.ts', covered),
      ...positions('loose/consumer.ts', outside),
    ].sort()
    const streamed: {path: string; line: number; column: number}[] = []
    const query = {
      file: 'core/entry.ts',
      kind: 'references',
      offset: source.indexOf('greet'),
      source,
    } as const
    const release = client.prioritize()
    try {
      const warming = client.warm()
      expect(
        keys(await client.query({...query, receive: (found) => streamed.push(...found)})),
      ).toEqual(expected)
      expect([...new Set(keys(streamed))].sort()).toEqual(expected)
      expect(await warming).toBe(true)
      expect(keys(await client.query(query))).toEqual(expected)
    } finally {
      release()
      await client.dispose()
      rmSync(root, {force: true, recursive: true})
    }
  })
})
