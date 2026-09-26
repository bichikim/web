import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {runKnowledgeCli} from '../main'
import {
  doctorKnowledgeRepository,
  getKnowledgeRepository,
  KnowledgeCommandFailure,
  reindexKnowledgeRepository,
  statusKnowledgeRepository,
} from '../runtime'

vi.mock('../runtime', async () => {
  const actual = await vi.importActual<typeof import('../runtime')>('../runtime')
  return {
    ...actual,
    doctorKnowledgeRepository: vi.fn(),
    getKnowledgeRepository: vi.fn(),
    reindexKnowledgeRepository: vi.fn(),
    statusKnowledgeRepository: vi.fn(),
  }
})

const scope = {repoId: 'test/repo', workspaceId: 'refs/heads/main'}

beforeEach(() => {
  vi.spyOn(process.stdout, 'write').mockReturnValue(true)
  vi.spyOn(process.stderr, 'write').mockReturnValue(true)
  vi.mocked(getKnowledgeRepository).mockResolvedValue({
    ...scope,
    command: 'get',
    logicalId: 'auth#refresh',
    points: [
      {
        payload: {
          ...scope,
          contentHash: 'hash',
          docId: 'auth',
          path: 'auth.md',
          relations: [],
          status: 'active',
          tags: [],
          text: 'Token policy',
          title: 'Refresh',
          type: 'rule',
          unitId: 'refresh',
        },
        pointId: 'one',
      },
    ],
  })
  vi.mocked(statusKnowledgeRepository).mockResolvedValue({
    ...scope,
    collection: 'knowledge-v1',
    command: 'status',
    documents: 1,
    statuses: {active: 2, conflicting: 0, deprecated: 0, superseded: 0},
    units: 2,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('runKnowledgeCli read commands', () => {
  it('should emit doctor JSON and return nonzero when a check fails', async () => {
    vi.mocked(doctorKnowledgeRepository).mockResolvedValue({
      checks: [{code: 'index-schema-mismatch', name: 'schema', status: 'fail'}],
      command: 'doctor',
      healthy: false,
    })
    expect(await runKnowledgeCli(['doctor', '/repo', '--json'])).toBe(1)
    expect(doctorKnowledgeRepository).toHaveBeenCalledWith('/repo')
    const output = vi.mocked(process.stdout.write).mock.calls[0][0]
    expect(JSON.parse(String(output))).toMatchObject({command: 'doctor', healthy: false})
    expect(process.stderr.write).not.toHaveBeenCalled()
  })
  it('should return zero and print passing doctor checks', async () => {
    vi.mocked(doctorKnowledgeRepository).mockResolvedValue({
      checks: [{name: 'storage', status: 'pass'}],
      command: 'doctor',
      healthy: true,
    })
    expect(await runKnowledgeCli(['doctor', '/repo'])).toBe(0)
    expect(process.stdout.write).toHaveBeenCalledWith('PASS storage\n')
  })
  it('should keep reindex a preview and separate the pre-write plan from JSON results', async () => {
    const plan = {
      ...scope,
      collection: 'test',
      relationDiagnostics: 0,
      stale: 0,
      stored: 1,
      units: 1,
    }
    vi.mocked(reindexKnowledgeRepository).mockImplementation(async (options) => {
      options.onPlan?.(plan)
      return {command: 'reindex', executed: false, plan}
    })
    expect(await runKnowledgeCli(['reindex', '/repo', '--json'])).toBe(0)
    expect(reindexKnowledgeRepository).toHaveBeenCalledWith(
      expect.objectContaining({confirmed: false}),
    )
    expect(process.stderr.write).toHaveBeenCalledWith(
      `${JSON.stringify({event: 'reindex-plan', ...plan})}\n`,
    )
    expect(process.stdout.write).toHaveBeenCalledTimes(1)
    expect(JSON.parse(String(vi.mocked(process.stdout.write).mock.calls[0][0]))).toMatchObject({
      executed: false,
    })
  })
  it('should pass explicit rebuild confirmation and print completed counts', async () => {
    vi.mocked(reindexKnowledgeRepository).mockResolvedValue({
      command: 'reindex',
      executed: true,
      plan: {...scope, collection: 'test', relationDiagnostics: 0, stale: 0, stored: 1, units: 1},
      progress: {deleted: 0, embedded: 1, metadata: 0, unchanged: 0},
    })
    expect(await runKnowledgeCli(['reindex', '/repo', '--yes'])).toBe(0)
    expect(reindexKnowledgeRepository).toHaveBeenCalledWith(
      expect.objectContaining({confirmed: true}),
    )
    expect(process.stdout.write).toHaveBeenCalledWith('Reindexed 1 units; deleted=0\n')
  })
  it('should emit one JSON get result with no stderr output', async () => {
    expect(await runKnowledgeCli(['get', 'auth#refresh', '--repo', '/repo', '--json'])).toBe(0)
    expect(getKnowledgeRepository).toHaveBeenCalledWith(
      expect.objectContaining({inputPath: '/repo', logicalId: 'auth#refresh'}),
    )
    const output = vi.mocked(process.stdout.write).mock.calls[0][0]
    expect(JSON.parse(String(output))).toMatchObject({command: 'get', points: [{pointId: 'one'}]})
    expect(process.stdout.write).toHaveBeenCalledTimes(1)
    expect(process.stderr.write).not.toHaveBeenCalled()
  })
  it('should display a retrieved unit with its source and status', async () => {
    expect(await runKnowledgeCli(['get', 'auth#refresh', '--repo', '/repo'])).toBe(0)
    expect(process.stdout.write).toHaveBeenCalledWith(
      'Refresh (active)\nauth.md:1  auth#refresh\nToken policy\n\n',
    )
  })
  it('should emit scoped status JSON', async () => {
    expect(await runKnowledgeCli(['status', '/repo', '--json'])).toBe(0)
    expect(statusKnowledgeRepository).toHaveBeenCalledWith('/repo')
    const output = vi.mocked(process.stdout.write).mock.calls[0][0]
    expect(JSON.parse(String(output))).toMatchObject({
      ...scope,
      command: 'status',
      documents: 1,
      units: 2,
    })
    expect(process.stderr.write).not.toHaveBeenCalled()
  })
  it('should display stored counts without claiming current-file freshness', async () => {
    expect(await runKnowledgeCli(['status', '--repo', '/repo'])).toBe(0)
    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('Stored: 1 documents / 2 units'),
    )
    expect(process.stdout.write).toHaveBeenCalledWith(expect.stringContaining('active=2'))
  })
  it('should report not-found on stderr with exit code one and no result', async () => {
    const result = {error: {code: 'knowledge-not-found', logicalId: 'missing'}, ok: false}
    vi.mocked(getKnowledgeRepository).mockRejectedValueOnce(new KnowledgeCommandFailure(result))
    expect(await runKnowledgeCli(['get', 'missing', '--json'])).toBe(1)
    expect(process.stdout.write).not.toHaveBeenCalled()
    expect(process.stderr.write).toHaveBeenCalledWith(`${JSON.stringify(result)}\n`)
  })
})
