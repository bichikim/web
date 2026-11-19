import path from 'node:path'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {resolveOptions} from '../config'
import {NaturalLintCore} from '../core'
import {NaturalLintSession} from '../plugin'
import {analyzeProject} from '../project'
import type {NaturalLintDiagnostic, ProjectAnalysisReport} from '../types'

vi.mock('../project', () => ({analyzeProject: vi.fn()}))

const createDiagnostic = (filePath: string, message = filePath): NaturalLintDiagnostic =>
  Object.freeze({
    filePath,
    message,
    probability: 0.9,
    relativePath: filePath,
    ruleId: 'fixture',
    severity: 'error',
  })

const createReport = (diagnostics: ReadonlyArray<NaturalLintDiagnostic>): ProjectAnalysisReport =>
  Object.freeze({
    cacheHits: 0,
    diagnostics: Object.freeze(diagnostics),
    experiments: [],
    filesScanned: 0,
    modelCalls: 0,
    outcomes: [],
  })

const createSession = () => {
  const options = resolveOptions(
    {
      rules: [
        {
          id: 'fixture',
          inspect: () => ({status: 'pass'}),
          message: 'Fixture diagnostic.',
          questions: {violation: {instruction: 'Fixture question?', type: 'noul'}},
          reduce: () => ({probability: 0, status: 'pass'}),
        },
      ],
    },
    process.cwd(),
    {useCache: false},
  )
  const core = new NaturalLintCore(options, {
    create: vi.fn(),
    identifier: 'fixture',
    revision: '1',
  })
  return {core, options, session: new NaturalLintSession(core, options)}
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

describe('NaturalLintSession.initialize', () => {
  it('should group by original paths and retain order, duplicate references and the report', async () => {
    const {core, options, session} = createSession()
    const second = createDiagnostic('src/z.ts')
    const first = createDiagnostic('src/a.ts')
    const alias = createDiagnostic('./src/a.ts')
    const absolute = createDiagnostic(path.resolve('src/a.ts'))
    const warning = Object.freeze({...second, message: 'warning', severity: 'warn' as const})
    const diagnostics = [second, first, alias, second, absolute, warning]
    const report = createReport(diagnostics)
    vi.mocked(analyzeProject).mockResolvedValue(report)

    expect(await session.initialize()).toBe(report)
    expect(analyzeProject).toHaveBeenCalledWith(core, options)
    // allDiagnostics sorts paths; inspect buckets to cover first-appearance order as well.
    expect([...session['diagnostics'].keys()]).toEqual([
      second.filePath,
      first.filePath,
      alias.filePath,
      absolute.filePath,
    ])
    const expected = [alias, absolute, first, second, second, warning].sort((left, right) =>
      left.filePath.localeCompare(right.filePath),
    )
    session.allDiagnostics.forEach((diagnostic, index) => {
      expect(diagnostic).toBe(expected[index])
    })
    expect(session.allDiagnostics).toHaveLength(expected.length)
    expect(report.diagnostics).toBe(diagnostics)
    expect(diagnostics).toEqual([second, first, alias, second, absolute, warning])

    session.remove(absolute.filePath)
    expect(session.allDiagnostics).toContain(first)
    expect(session.allDiagnostics).toContain(alias)
    expect(session.allDiagnostics).not.toContain(absolute)
  })

  it('should replace previous results after each completed initialization, including an empty report', async () => {
    const {session} = createSession()
    const previous = createDiagnostic('previous.ts')
    const current = createDiagnostic('current.ts')
    const empty = createReport([])
    vi.mocked(analyzeProject)
      .mockResolvedValueOnce(createReport([previous]))
      .mockResolvedValueOnce(createReport([current]))
      .mockResolvedValueOnce(empty)

    await session.initialize()
    expect(session.allDiagnostics).toEqual([previous])
    await session.initialize()
    expect(session.allDiagnostics).toEqual([current])
    expect(await session.initialize()).toBe(empty)
    expect(session.allDiagnostics).toEqual([])
  })

  it('should preserve previous diagnostics while analysis is pending and when it rejects', async () => {
    const {session} = createSession()
    const previous = createDiagnostic('previous.ts')
    vi.mocked(analyzeProject).mockResolvedValueOnce(createReport([previous]))
    await session.initialize()
    const pending = Promise.withResolvers<ProjectAnalysisReport>()
    const failure = new Error('analysis failed')
    vi.mocked(analyzeProject).mockReturnValueOnce(pending.promise)

    const initialization = session.initialize()
    expect(session.allDiagnostics).toEqual([previous])
    pending.reject(failure)
    await expect(initialization).rejects.toBe(failure)
    expect(session.allDiagnostics[0]).toBe(previous)
    expect(session.allDiagnostics).toHaveLength(1)
  })

  it.each(['reserve', 'update', 'remove'] as const)(
    'should exclude original and equivalent paths after %s during initial analysis',
    async (operation) => {
      const {core, session} = createSession()
      const pending = Promise.withResolvers<ProjectAnalysisReport>()
      const relative = createDiagnostic('src/changed.ts')
      const alias = createDiagnostic('./src/changed.ts')
      const absolute = createDiagnostic(path.resolve(relative.filePath))
      const untouched = createDiagnostic('src/untouched.ts')
      const report = createReport([relative, untouched, alias, absolute, relative])
      vi.mocked(analyzeProject).mockReturnValueOnce(pending.promise)
      const initialization = session.initialize()

      if (operation === 'update') {
        vi.spyOn(core, 'analyzeFile').mockResolvedValue({
          cacheHits: 0,
          diagnostics: [absolute],
          filePath: absolute.filePath,
          modelCalls: 0,
          outcomes: [],
        })
        await session.update(relative.filePath, 'updated source')
        expect(session.allDiagnostics).toEqual([absolute])
      } else {
        session[operation](relative.filePath)
      }
      pending.resolve(report)

      expect(await initialization).toBe(report)
      expect(session.allDiagnostics).toEqual([untouched])
      expect(session.allDiagnostics[0]).toBe(untouched)
      expect(report.diagnostics).toEqual([relative, untouched, alias, absolute, relative])
      vi.mocked(analyzeProject).mockResolvedValueOnce(report)
      await session.initialize()
      expect(session.allDiagnostics).toEqual([untouched])
    },
  )

  it.each([
    [10, 100],
    [100, 200],
  ])(
    'should retain every diagnostic across %i files with %i diagnostics each',
    async (files, count) => {
      const {session} = createSession()
      const diagnostics = Array.from({length: count}, (_, index) =>
        Array.from({length: files}, (_, file) =>
          createDiagnostic(`src/${String(file).padStart(3, '0')}.ts`, String(index)),
        ),
      ).flat()
      const original = [...diagnostics]
      const report = createReport(diagnostics)
      vi.mocked(analyzeProject).mockResolvedValue(report)

      expect(await session.initialize()).toBe(report)
      const actual = session.allDiagnostics
      expect(actual).toHaveLength(files * count)
      expect(
        actual.every((diagnostic, index) => {
          const file = Math.floor(index / count)
          const offset = index % count
          return diagnostic === original[offset * files + file]
        }),
      ).toBe(true)
      expect(diagnostics.every((diagnostic, index) => diagnostic === original[index])).toBe(true)
    },
  )
})
