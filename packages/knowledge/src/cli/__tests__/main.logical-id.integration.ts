/** @vitest-environment jsdom */
/* oxlint-disable no-await-in-loop -- Capture process stdout sequentially while executing copied commands. */
import {execFile} from 'node:child_process'
import {access, mkdir, mkdtemp, rm, unlink, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {promisify} from 'node:util'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {QdrantClient} from '@qdrant/js-client-rest'
import {createOllamaEmbeddingProvider} from '../../adapters/ollama'
import type {KnowledgePointPayload} from '../../indexing/store'
import type {DenseEmbeddingProvider} from '../../embedding/provider'
import {runKnowledgeCli} from '../main'

vi.mock('@qdrant/js-client-rest', () => ({QdrantClient: vi.fn()}))
vi.mock('../../adapters/ollama', () => ({createOllamaEmbeddingProvider: vi.fn()}))

interface LocalPoint {
  readonly id: string
  readonly payload: KnowledgePointPayload
}
interface FilterRequest {
  readonly filter: {readonly must: ReadonlyArray<{key: string; match: {value: string}}>}
}
const execute = promisify(execFile)
const identity = {dimensions: 2, model: 'fixture', provider: 'ollama'}
let root: string
let stored: LocalPoint[]
const scroll = vi.fn()
const matches = (point: LocalPoint, request: FilterRequest) =>
  request.filter.must.every(({key, match}) => Reflect.get(point.payload, key) === match.value)

const run = async (arguments_: string[]) => {
  const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
  const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true)
  try {
    const code = await runKnowledgeCli(arguments_)
    return {
      code,
      stderr: stderr.mock.calls.map(([text]) => String(text)).join(''),
      stdout: stdout.mock.calls.map(([text]) => String(text)).join(''),
    }
  } finally {
    stdout.mockRestore()
    stderr.mockRestore()
  }
}
const index = () => run(['index', root, '--json'])
const get = (id: string) => run(['get', id, '--repo', root, '--json'])

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'knowledge-logical-id-'))
  await execute('git', ['init', '-b', 'main', root])
  await execute('git', [
    '-C',
    root,
    'remote',
    'add',
    'origin',
    'https://github.com/local/knowledge-fixture.git',
  ])
  await mkdir(join(root, 'docs'))
  await writeFile(join(root, 'docs/C#.md'), '# Overview\nC# guide\n')
  await execute('git', ['-C', root, 'add', '.'])
  await execute('git', [
    '-C',
    root,
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    'commit',
    '-m',
    'Fixture',
  ])
  vi.stubEnv('XDG_CONFIG_HOME', join(root, '.xdg'))
  vi.stubEnv('KNOWLEDGE_QDRANT_URL', 'http://127.0.0.1:6333')
  vi.stubEnv('KNOWLEDGE_OLLAMA_URL', 'http://127.0.0.1:11434')
  vi.stubEnv('KNOWLEDGE_COLLECTION', 'logical-id-fixture')
  vi.stubEnv('KNOWLEDGE_QDRANT_API_KEY', '')
  stored = []
  scroll.mockReset()
  scroll.mockImplementation(async (_collection: string, request: FilterRequest) => ({
    next_page_offset: null,
    points: stored.filter((point) => matches(point, request)),
  }))
  vi.mocked(QdrantClient).mockImplementation(function QdrantClient() {
    return {
      collectionExists: vi.fn(async () => ({exists: true})),
      getCollection: vi.fn(async () => ({
        config: {
          metadata: {knowledge: {embedding: identity, schemaVersion: 1}},
          params: {
            sparse_vectors: {sparse: {modifier: 'idf'}},
            vectors: {dense: {distance: 'Cosine', size: 2}},
          },
        },
      })),
      query: vi.fn(async (_collection: string, request: FilterRequest) => ({
        points: stored
          .filter((point) => matches(point, request))
          .map((point) => ({...point, score: 1})),
      })),
      scroll,
      upsert: vi.fn(async (_collection: string, request: {points: LocalPoint[]}) => {
        stored.push(...request.points)
        return {status: 'completed'}
      }),
    } as unknown as QdrantClient
  })
  vi.mocked(createOllamaEmbeddingProvider).mockReturnValue({
    embed: vi.fn<DenseEmbeddingProvider['embed']>(async (inputs) => ({
      ok: true,
      value: {identity, vectors: inputs.map(() => [1, 0])},
    })),
  })
})
afterEach(async () => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
  await rm(root, {force: true, recursive: true})
})

describe('Git source → production CLI/runtime/parser/index/adapters → local SDK fixture', () => {
  it('should keep legacy raw hash IDs rejected instead of reinterpreting them', async () => {
    expect((await index()).code).toBe(0)
    expect(stored).toHaveLength(1)
    expect(stored[0].payload).toMatchObject({
      docId: 'docs/C#.md',
      text: '# Overview\nC# guide',
      unitId: 'overview',
    })
    const search = await run(['search', 'C# guide', '--repo', root])
    expect(search.code).toBe(0)
    const result = await get('docs/C#.md#overview')
    expect(result.code).toBe(1)
    expect(result.stderr).toContain('invalid-logical-id')
  })
  it('should preserve the legacy whole-document string interpretation', async () => {
    expect((await index()).code).toBe(0)
    const result = await get('docs/C#.md')
    expect(result.code).toBe(1)
    expect(result.stderr).toContain('knowledge-not-found')
  })
  it('should retrieve whole documents and exact units using separate identity fields without reindexing', async () => {
    await writeFile(join(root, 'docs/C#.md'), '# Overview\nC# guide\n# Next\nSecond section\n')
    expect((await index()).code).toBe(0)
    const snapshot = structuredClone(stored)
    await unlink(join(root, 'docs/C#.md'))
    const document = await run(['get', '--doc-id=docs/C#.md', '--repo', root, '--json'])
    expect(document.code).toBe(0)
    expect(JSON.parse(document.stdout)).toMatchObject({
      points: [{}, {}],
      selector: {docId: 'docs/C#.md'},
    })
    expect(JSON.parse(document.stdout)).not.toHaveProperty('logicalId')
    const human = await run(['get', '--doc-id=docs/C#.md', '--repo', root])
    expect(human.code).toBe(0)
    expect(human.stdout).not.toContain('docs/C#.md#overview')
    expect(human.stdout).toContain("--doc-id='docs/C#.md' --unit-id='overview'")
    const unit = await run([
      'get',
      '--doc-id=docs/C#.md',
      '--unit-id=overview',
      '--repo',
      root,
      '--json',
    ])
    expect(unit.code).toBe(0)
    expect(JSON.parse(unit.stdout)).toMatchObject({
      points: [{payload: {unitId: 'overview'}}],
      selector: {docId: 'docs/C#.md', unitId: 'overview'},
    })
    expect(stored).toEqual(snapshot)
  })
  it.each([
    'docs/C#.md',
    'docs/C#.txt',
    'docs/C%23.md',
    'docs/plain space.md',
    '--option.md',
    "docs/It's %23# $(touch injected).md",
  ])('should execute the copyable search command for the Git path %s', async (path) => {
    await writeFile(join(root, path), '# Overview\nC# guide\n')
    expect((await index()).code).toBe(0)
    const snapshot = structuredClone(stored)
    const search = await run(['search', 'guide', '--repo', root])
    expect(search.code).toBe(0)
    const commands = search.stdout.split('\n').filter((line) => line.startsWith('Get: '))
    expect(commands).toHaveLength(stored.length)
    for (const line of commands) {
      const command = line.slice('Get: '.length)
      const parsed = await execute('sh', ['-c', `set -- ${command}\nprintf '%s\\0' "$@"`], {
        cwd: root,
      })
      const invocation = parsed.stdout.split('\0').slice(0, -1)
      expect(invocation.slice(0, 2)).toEqual([
        process.execPath,
        resolve('packages/knowledge/bin/know.mjs'),
      ])
      const executable = await execute(invocation[0], [invocation[1], '--help'])
      expect(executable.stdout).toContain('know get')
      const arguments_ = invocation.slice(2)
      const result = await run([...arguments_, '--json'])
      expect(result.code).toBe(0)
      const retrieved = JSON.parse(result.stdout)
      const expected = snapshot.find((point) => `--doc-id=${point.payload.docId}` === arguments_[1])
      expect(retrieved.points).toMatchObject([{pointId: expected?.id}])
      expect(retrieved).not.toHaveProperty('logicalId')
    }
    await expect(access(join(root, 'injected'))).rejects.toMatchObject({code: 'ENOENT'})
    expect(stored).toEqual(snapshot)
  })
  it('should demonstrate literal percent paths remain distinct and encoded path links resolve', async () => {
    await writeFile(join(root, 'docs/C%23.md'), '# Overview\nLiteral percent filename\n')
    await writeFile(
      join(root, 'docs/ref.md'),
      '# Links\n[hash](./C%23.md#overview)\n[percent](./C%2523.md#overview)\n' +
        '[[docs/C#.md#overview]]\n[[docs/C%23.md#overview]]\n',
    )
    const indexed = await index()
    expect(indexed.code).toBe(0)
    expect(JSON.parse(indexed.stdout).diagnostics).toContainEqual({
      code: 'missing-document',
      docId: 'docs/ref.md',
      target: 'docs/C#.md#overview',
      unitId: 'links',
    })
    const links = stored.find((point) => point.payload.docId === 'docs/ref.md')
    expect(links?.payload.relations).toEqual([
      {targetDocId: 'docs/C#.md', targetUnitId: 'overview', type: 'links-to'},
      {targetDocId: 'docs/C%23.md', targetUnitId: 'overview', type: 'links-to'},
    ])
    const result = await get('docs/C%23.md#overview')
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('Literal percent filename')
  })
  it('should demonstrate a valid competing document/unit receives the whole-document input', async () => {
    await writeFile(
      join(root, 'docs/other.md'),
      '---\nknowledge:\n  id: docs/C\n---\n# Other {#.md}\nOther document contents\n',
    )
    expect((await index()).code).toBe(0)
    const result = await get('docs/C#.md')
    expect(result.code).toBe(0)
    expect(JSON.parse(result.stdout).points[0].payload.docId).toBe('docs/C')
    expect(result.stdout).toContain('Other document contents')
    const structured = await run([
      'get',
      '--doc-id=docs/C#.md',
      '--unit-id=overview',
      '--repo',
      root,
      '--json',
    ])
    expect(structured.code).toBe(0)
    expect(JSON.parse(structured.stdout).points).toMatchObject([
      {payload: {docId: 'docs/C#.md', unitId: 'overview'}},
    ])
  })
})
