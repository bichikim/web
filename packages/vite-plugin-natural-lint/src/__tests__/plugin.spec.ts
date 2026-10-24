import {mkdir, mkdtemp, realpath, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {afterEach, expect, it, vi} from 'vitest'
import {build, createLogger, createServer} from 'vite'
import {resolveOptions} from '../config'
import {NaturalLintCore} from '../core'
import {naturalLint, NaturalLintSession} from '../plugin'
import type {DecisionProviderFactory} from '../types'

const temporaryPaths: string[] = []

const createRule = (severity: 'error' | 'experiment' = 'error') => ({
  id: 'filename',
  inspect: ({fileName}: {fileName: {stem: string}}) => ({
    state: {fileName: fileName.stem},
    status: 'unknown' as const,
  }),
  message: '파일 이름이 불필요하게 길다.',
  questions: {violation: {instruction: 'Can the filename be shorter?', type: 'noul' as const}},
  reduce: ({answers}: {answers: {violation?: {probability: number}}}) => ({
    probability: answers.violation?.probability ?? 0.5,
    status: 'fail' as const,
  }),
  select: ({fileName}: {fileName: {words: ReadonlyArray<string>}}) => fileName.words.length > 3,
  severity,
})

afterEach(async () => {
  await Promise.all(
    temporaryPaths.splice(0).map((filePath) => rm(filePath, {force: true, recursive: true})),
  )
})

it('should fail a Vite build after the selected file violates a natural-language rule', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'natural-lint-vite-'))
  temporaryPaths.push(root)
  await mkdir(path.join(root, 'src'))
  await writeFile(
    path.join(root, 'index.html'),
    '<script type="module" src="/src/main.ts"></script>',
  )
  await writeFile(path.join(root, 'src/main.ts'), 'document.body.textContent = "ready"')
  await writeFile(
    path.join(root, 'src/authenticated-user-profile-form.ts'),
    'export function UserProfileForm() {}',
  )
  const providerFactory: DecisionProviderFactory = {
    async create() {
      return {
        async close() {},
        async decide() {
          return {violation: {probability: 0.94, type: 'noul'}}
        },
      }
    },
    identifier: 'test',
    revision: '1',
  }

  await expect(
    build({
      configFile: false,
      logLevel: 'silent',
      plugins: [
        naturalLint(
          {
            rules: [createRule()],
          },
          providerFactory,
        ),
      ],
      root,
    }),
  ).rejects.toThrow('Natural lint found 1 error')
})

it('should print the experiment report when a Vite build ends without failing it', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'natural-lint-vite-'))
  temporaryPaths.push(root)
  await mkdir(path.join(root, 'src'))
  await writeFile(
    path.join(root, 'index.html'),
    '<script type="module" src="/src/main.ts"></script>',
  )
  await writeFile(path.join(root, 'src/main.ts'), 'document.body.textContent = "ready"')
  const providerFactory: DecisionProviderFactory = {
    async create() {
      return {
        async close() {},
        async decide() {
          return {violation: {probability: 0.9, type: 'noul'}}
        },
      }
    },
    identifier: 'test',
    revision: '1',
  }
  const logger = createLogger('silent')
  const info = vi.spyOn(logger, 'info')

  await build({
    configFile: false,
    customLogger: logger,
    logLevel: 'silent',
    plugins: [
      naturalLint(
        {
          rules: [{...createRule('experiment'), id: 'filename-experiment'}],
        },
        providerFactory,
      ),
    ],
    root: await realpath(root),
  })

  expect(info).toHaveBeenCalledWith(expect.stringContaining('Experiment filename-experiment'))
})

it('should overlap a production build with analysis and wait before finishing', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'natural-lint-vite-'))
  temporaryPaths.push(root)
  await mkdir(path.join(root, 'src'))
  await writeFile(
    path.join(root, 'index.html'),
    '<script type="module" src="/src/main.ts"></script>',
  )
  await writeFile(path.join(root, 'src/main.ts'), 'document.body.textContent = "ready"')
  await writeFile(path.join(root, 'src/long-file-name-for-check.ts'), 'export const value = 1')
  let analysisClosed = false
  let releaseAnalysis: (() => void) | undefined
  const buildStarted = new Promise<void>((resolve) => {
    releaseAnalysis = resolve
  })
  const providerFactory: DecisionProviderFactory = {
    async create() {
      await buildStarted
      return {
        async close() {
          analysisClosed = true
        },
        async decide() {
          return {violation: {probability: 0.1, type: 'noul'}}
        },
      }
    },
    identifier: 'test',
    revision: '1',
  }

  await build({
    configFile: false,
    logLevel: 'silent',
    plugins: [
      naturalLint({rules: [createRule('experiment')]}, providerFactory),
      {
        buildStart() {
          releaseAnalysis?.()
        },
        name: 'confirm-vite-build-started',
      },
    ],
    root: await realpath(root),
  })

  expect(analysisClosed).toBe(true)
})

it('should start the Vite development server without waiting for natural lint', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'natural-lint-vite-'))
  temporaryPaths.push(root)
  await mkdir(path.join(root, 'src'))
  await writeFile(path.join(root, 'src/long-file-name-for-check.ts'), 'export const value = 1')
  let finishProvider: (() => void) | undefined
  const providerFinished = new Promise<void>((resolve) => {
    finishProvider = resolve
  })
  const providerFactory: DecisionProviderFactory = {
    async create() {
      await providerFinished
      return {
        async close() {},
        async decide() {
          return {violation: {probability: 0.1, type: 'noul'}}
        },
      }
    },
    identifier: 'test',
    revision: '1',
  }
  const server = await createServer({
    configFile: false,
    logLevel: 'silent',
    plugins: [naturalLint({rules: [createRule()]}, providerFactory)],
    root,
    server: {middlewareMode: true},
  })

  await expect(server.pluginContainer.buildStart({})).resolves.toBeUndefined()
  finishProvider?.()
  await server.close()
})

it('should not restore diagnostics for a file deleted during initial analysis', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'natural-lint-vite-'))
  temporaryPaths.push(root)
  await mkdir(path.join(root, 'src'))
  const filePath = path.join(root, 'src/long-file-name-for-check.ts')
  await writeFile(filePath, 'export const value = 1')
  let finishDecision: (() => void) | undefined
  let decisionStarted: (() => void) | undefined
  const started = new Promise<void>((resolve) => {
    decisionStarted = resolve
  })
  const finish = new Promise<void>((resolve) => {
    finishDecision = resolve
  })
  const providerFactory: DecisionProviderFactory = {
    async create() {
      return {
        async close() {},
        async decide() {
          decisionStarted?.()
          await finish
          return {violation: {probability: 0.94, type: 'noul'}}
        },
      }
    },
    identifier: 'test',
    revision: '1',
  }
  const options = resolveOptions({rules: [createRule()]}, root)
  const session = new NaturalLintSession(new NaturalLintCore(options, providerFactory), options)
  const initialization = session.initialize()
  await started
  await rm(filePath)
  session.remove(filePath)
  finishDecision?.()
  await initialization
  await session.close()

  expect(session.allDiagnostics).toEqual([])
})
