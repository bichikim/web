import {afterEach, beforeEach, expect, test} from 'vitest'
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {createEmptyDocument} from '@winter-love/puppet/player'
import {createModelBackend} from '../../backend/create-model-backend'
import {createCommandService} from '../../backend/create-command-service'
import {readDocumentPath} from '../../backend/node/read-document-path'
import {writeDocumentPath} from '../../backend/node/write-document-path'
import {runRecipe} from '../run-recipe'

let workspace: string
beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'poffo-recipe-'))
})
afterEach(async () => {
  await rm(workspace, {force: true, recursive: true})
})

const setup = async () => {
  await writeFile(join(workspace, 'source.json'), JSON.stringify(createEmptyDocument()))
  await writeFile(
    join(workspace, 'recipe.json'),
    JSON.stringify({
      input: 'source.json',
      output: {path: 'result.poffo'},
      steps: [
        {patch: [{op: 'add', path: '/framesPerSecond', value: 48}], type: 'patch'},
        {patch: [{op: 'add', path: '/framesPerSecond', value: 60}], type: 'patch'},
      ],
      version: 1,
    }),
  )
  const model = createModelBackend({document: createEmptyDocument(), sessionId: 'recipe'})
  const service = createCommandService({
    files: {
      read: (path) => readDocumentPath(join(workspace, path)),
      write: (path, content, overwrite) =>
        writeDocumentPath({content, overwrite, path: join(workspace, path)}),
    },
    model,
  })
  return {model, service}
}

test('should execute a recipe and verify the saved native result', async () => {
  const {model, service} = await setup()
  const result = await runRecipe({execute: service.execute, path: 'recipe.json', workspace})
  expect(result.report).toMatchObject({complete: true, completed: 2})
  expect(model.read().document.framesPerSecond).toBe(60)
  expect(await readDocumentPath(join(workspace, 'result.poffo'))).toMatchObject({
    document: {framesPerSecond: 60},
    ok: true,
  })
  expect(JSON.parse(await readFile(join(workspace, result.reportPath), 'utf8'))).toEqual(
    result.report,
  )
})

test('should restore the exact checkpoint and resume only incomplete steps after failure', async () => {
  const {model, service} = await setup()
  let applies = 0
  await expect(
    runRecipe({
      execute: async (request) => {
        if (request.operation === 'edit.apply') {
          applies += 1
        }
        if (request.operation === 'edit.apply' && applies === 2) {
          return {error: {code: 'test-interruption', message: 'interrupted'}, ok: false}
        }
        return service.execute(request)
      },
      path: 'recipe.json',
      workspace,
    }),
  ).rejects.toThrow('test-interruption')
  expect(model.read().document.framesPerSecond).toBe(48)
  const resumed = await runRecipe({
    execute: async (request) => {
      if (request.operation === 'edit.apply') {
        applies += 1
      }
      return service.execute(request)
    },
    path: 'recipe.json',
    resume: true,
    workspace,
  })
  expect(applies).toBe(3)
  expect(resumed.report).toMatchObject({complete: true, completed: 2})
  expect(model.read().document.framesPerSecond).toBe(60)
})

test('should reject a modified checkpoint before restoring or executing any steps', async () => {
  const {service} = await setup()
  const result = await runRecipe({execute: service.execute, path: 'recipe.json', workspace})
  await writeFile(join(workspace, result.report.checkpoint.path), 'changed')
  await expect(
    runRecipe({execute: service.execute, path: 'recipe.json', resume: true, workspace}),
  ).rejects.toThrow('artifact-mismatch')
})

test('should reject an intervening GUI edit instead of incorporating it into later recipe steps', async () => {
  const {model, service} = await setup()
  let previews = 0
  await expect(
    runRecipe({
      execute: async (request) => {
        if (request.operation === 'edit.preview') {
          previews += 1
          if (previews === 2) {
            model.request({
              document: {...model.read().document, framesPerSecond: 70},
              expectedRevision: model.read().revision,
              ownerId: 'gui',
              requestId: 'intervening',
              type: 'edit',
            })
          }
        }
        return service.execute(request)
      },
      path: 'recipe.json',
      workspace,
    }),
  ).rejects.toThrow('stale-revision')
  expect(model.read().document.framesPerSecond).toBe(70)
  await expect(readFile(join(workspace, 'result.poffo'))).rejects.toMatchObject({code: 'ENOENT'})
})
