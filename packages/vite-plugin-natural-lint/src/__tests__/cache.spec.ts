import {mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'
import {DecisionCache} from '../cache'

const temporaryPaths: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryPaths.splice(0).map((filePath) => rm(filePath, {force: true, recursive: true})),
  )
})

describe('DecisionCache', () => {
  it('should persist a rule outcome across cache instances', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'natural-lint-cache-'))
    temporaryPaths.push(directory)
    const cache = new DecisionCache(directory)
    const outcome = {
      probability: 0.92,
      ruleId: 'filename',
      status: 'fail',
    } as const

    await cache.write('entry', outcome)

    await expect(new DecisionCache(directory).read('entry')).resolves.toEqual(outcome)
  })

  it('should treat malformed entries as cache misses', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'natural-lint-cache-'))
    temporaryPaths.push(directory)
    const cache = new DecisionCache(directory)
    await cache.write('entry', {ruleId: 'filename', status: 'skip'})
    await writeFile(path.join(directory, 'results/entry.json'), '{broken')

    await expect(cache.read('entry')).resolves.toBeUndefined()
  })

  it('should preserve structured answers and the reducer reason', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'natural-lint-cache-'))
    temporaryPaths.push(directory)
    const cache = new DecisionCache(directory)
    const outcome = {
      answers: {
        relationship: {
          choice: 'dependent',
          confidence: 0.91,
          probabilities: {dependent: 0.91, independent: 0.09},
          type: 'choice' as const,
        },
      },
      probability: 0.91,
      reason: 'dependent-oracle',
      ruleId: 'test-oracle',
      status: 'fail' as const,
    }

    await cache.write('structured', outcome)

    await expect(new DecisionCache(directory).read('structured')).resolves.toEqual(outcome)
  })

  it('should preserve each case of a grouped decision after a cache read', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'natural-lint-cache-'))
    temporaryPaths.push(directory)
    const outcome = {
      cases: [
        {probability: 0, reason: 'rethrow', ruleId: 'catch-rule', status: 'pass' as const},
        {
          answers: {violation: {probability: 0.93, type: 'noul' as const}},
          probability: 0.93,
          reason: 'hidden-failure',
          ruleId: 'catch-rule',
          state: {catchSource: 'catch { return null }'},
          status: 'fail' as const,
        },
      ],
      probability: 0.93,
      reason: 'hidden-failure',
      ruleId: 'catch-rule',
      status: 'fail' as const,
    }

    await new DecisionCache(directory).write('grouped', outcome)

    await expect(new DecisionCache(directory).read('grouped')).resolves.toEqual(outcome)
  })
})
