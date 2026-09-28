// @vitest-environment node
import {spawnSync} from 'node:child_process'
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {afterEach, expect, it} from 'vitest'

const binaryPath = fileURLToPath(new URL('../index.js', import.meta.url))
const temporaryProjects: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryProjects.splice(0).map((directory) => rm(directory, {force: true, recursive: true})),
  )
})

it('should allow non-interactive review answers without OpenTUI FFI', async () => {
  const projectRoot = await mkdtemp(path.join(tmpdir(), 'natural-lint-bin-'))
  temporaryProjects.push(projectRoot)
  await writeFile(
    path.join(projectRoot, 'natural-lint.config.mjs'),
    `export default {
  rules: [{
    id: 'unused',
    inspect: () => ({state: {}, status: 'unknown'}),
    message: 'Unused rule',
    questions: {violation: {instruction: 'Is this a violation?', type: 'noul'}},
    reduce: () => ({probability: 1, status: 'fail'}),
    select: () => false,
    severity: 'experiment',
  }],
}\n`,
  )
  await mkdir(path.join(projectRoot, 'src'))
  await writeFile(path.join(projectRoot, 'src/fixture.ts'), 'export const fixture = true')
  await writeFile(path.join(projectRoot, 'answers.jsonl'), '')

  const result = spawnSync(
    process.execPath,
    [binaryPath, 'review', '--answers', 'answers.jsonl', '--json'],
    {cwd: projectRoot, encoding: 'utf8', timeout: 10_000},
  )

  expect(result.status, `${result.stderr}\n${result.stdout}`).toBe(0)
  expect(JSON.parse(result.stdout)).toMatchObject({candidates: 0, exported: 0, reviewed: 0})
})
