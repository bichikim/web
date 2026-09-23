import {mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createJevProviderFactory} from '../jev-provider'

let root: string

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'natural-lint-jev-'))
})

afterEach(async () => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  await rm(root, {force: true, recursive: true})
})

it('should send typed questions with the environment key and normalize answers', async () => {
  vi.stubEnv('TYPESAFE_API_KEY', 'test-key')
  vi.stubGlobal('window', undefined)
  await writeFile(path.join(root, '.env.local'), 'TYPESAFE_API_KEY=file-key\n')
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
    Response.json({
      answers: {
        scope: {
          choice: 'broad',
          confidence: 0.8,
          probabilities: {broad: 0.9, specific: 0.1},
          type: 'choice',
        },
        violation: {noul: 0.9, type: 'noul'},
      },
      model: 'jev-1.13.0',
      usage: {input_tokens: 20, output_tokens: 2},
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  const provider = await createJevProviderFactory(
    {concurrency: 4, model: 'jev-latest'},
    root,
  ).create()

  const answers = await provider.decide({
    questions: {
      scope: {
        criteria: {broad: 'Broad failures', specific: 'Expected absence'},
        instruction: 'What does the catch intercept?',
        type: 'choice',
      },
      violation: {instruction: 'Does it hide failure?', type: 'noul'},
    },
    ruleId: 'test/rule',
    state: {catchSource: 'catch { return null }'},
  })

  expect(answers).toMatchObject({scope: {choice: 'broad'}, violation: {probability: 0.9}})
  const [url, init] = fetchMock.mock.calls[0]!
  if (init === undefined) {
    throw new Error('Expected a Jev HTTP request.')
  }
  expect(url).toBe('https://api.typesafe.ai/v1/systemone')
  expect(new Headers(init.headers).get('authorization')).toBe('Bearer test-key')
  expect(JSON.parse(String(init.body))).toMatchObject({
    model: 'jev-latest',
    questions: {scope: {instructions: 'What does the catch intercept?'}},
    state: {catchSource: 'catch { return null }'},
  })
  await provider.close()
})
