import {mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {afterEach, expect, it, vi} from 'vitest'
import {createLayaProviderFactory} from '../laya-provider'

const temporaryPaths: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryPaths.splice(0).map((filePath) => rm(filePath, {force: true, recursive: true})),
  )
})

it('should launch managed CoreML with its isolated Python and model cache', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'natural-lint-provider-'))
  temporaryPaths.push(directory)
  const bridgePath = path.join(directory, 'bridge.mjs')
  await writeFile(
    bridgePath,
    [
      `const managed = process.argv.includes('--allow-download') &&`,
      `  process.env.HF_HOME === '/managed/huggingface'`,
      `process.stdout.write('{"type":"ready"}\\n')`,
      `process.stdin.on('data', (input) => {`,
      `  const request = JSON.parse(input.toString())`,
      `  const answers = {violation: {type: 'noul', noul: managed ? 0.91 : 0}}`,
      `  const result = {type: 'result', id: request.id, answers}`,
      `  process.stdout.write(JSON.stringify(result) + '\\n')`,
      `})`,
    ].join('\n'),
  )
  const ensureRuntime = vi.fn(async () => ({
    environment: {...process.env, HF_HOME: '/managed/huggingface'},
    pythonPath: process.execPath,
  }))
  const factory = createLayaProviderFactory(
    {
      bridgePath,
      computeUnits: undefined,
      coreml: {runtime: 'managed', runtimeDir: directory},
      model: 'fixture',
      modelRevision: '1',
      pythonPath: 'must-not-run',
    },
    ensureRuntime,
  )
  const provider = await factory.create()

  await expect(
    provider.decide({
      questions: {violation: {instruction: 'Is this a violation?', type: 'noul'}},
      ruleId: 'one',
      state: {name: 'managed'},
    }),
  ).resolves.toEqual({violation: {probability: 0.91, type: 'noul'}})
  expect(ensureRuntime).toHaveBeenCalledWith(directory)
  await provider.close()

  const offlineProvider = await factory.create()
  await expect(
    offlineProvider.decide({
      questions: {violation: {instruction: 'Is this a violation?', type: 'noul'}},
      ruleId: 'two',
      state: {name: 'cached'},
    }),
  ).resolves.toEqual({violation: {probability: 0, type: 'noul'}})
  await offlineProvider.close()
  expect(ensureRuntime).toHaveBeenCalledTimes(2)
})

it('should recover when a prepared model marker outlives the model cache', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'natural-lint-provider-'))
  temporaryPaths.push(directory)
  const bridgePath = path.join(directory, 'bridge.mjs')
  await writeFile(
    bridgePath,
    [
      `if (!process.argv.includes('--allow-download')) {`,
      `  process.stderr.write('model cache is missing')`,
      `  process.exit(2)`,
      `}`,
      `process.stdout.write('{"type":"ready"}\\n')`,
      `process.stdin.on('data', (input) => {`,
      `  const request = JSON.parse(input.toString())`,
      `  const answers = {violation: {type: 'noul', noul: 0.87}}`,
      `  process.stdout.write(JSON.stringify({type: 'result', id: request.id, answers}) + '\\n')`,
      `})`,
    ].join('\n'),
  )
  const factory = createLayaProviderFactory(
    {
      bridgePath,
      computeUnits: undefined,
      coreml: {runtime: 'managed', runtimeDir: directory},
      model: 'fixture',
      modelRevision: '1',
      pythonPath: 'must-not-run',
    },
    async () => ({environment: process.env, pythonPath: process.execPath}),
  )
  await (await factory.create()).close()

  const recovered = await factory.create()
  await expect(
    recovered.decide({
      questions: {violation: {instruction: 'Is this a violation?', type: 'noul'}},
      ruleId: 'recovered',
      state: {name: 'recovered'},
    }),
  ).resolves.toEqual({violation: {probability: 0.87, type: 'noul'}})
  await recovered.close()
})

it('should send structured state and typed questions in one bridge request', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'natural-lint-provider-'))
  temporaryPaths.push(directory)
  const bridgePath = path.join(directory, 'bridge.mjs')
  await writeFile(
    bridgePath,
    [
      `import {createInterface} from 'node:readline'`,
      `process.stdout.write('{"type":"ready"}\\n')`,
      `createInterface({input: process.stdin}).on('line', (line) => {`,
      `  const request = JSON.parse(line)`,
      `  const valid = request.state.expected === 'actual' &&`,
      `    request.questions.aliasesActual.instructions === 'Does expected alias actual?'`,
      `  const answers = {aliasesActual: {type: 'noul', noul: valid ? 0.96 : 0}}`,
      `  process.stdout.write(JSON.stringify({type: 'result', id: request.id, answers}) + '\\n')`,
      `})`,
    ].join('\n'),
  )
  const provider = await createLayaProviderFactory({
    bridgePath,
    computeUnits: undefined,
    coreml: {runtime: 'external', runtimeDir: directory},
    model: 'fixture',
    modelRevision: '1',
    pythonPath: process.execPath,
  }).create()

  await expect(
    provider.decide({
      questions: {
        aliasesActual: {instruction: 'Does expected alias actual?', type: 'noul'},
      },
      ruleId: 'test-oracle',
      state: {actual: 'call()', expected: 'actual'},
    }),
  ).resolves.toEqual({aliasesActual: {probability: 0.96, type: 'noul'}})
  await provider.close()
})
