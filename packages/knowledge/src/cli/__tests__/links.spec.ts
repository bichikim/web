import {chmod, mkdir, mkdtemp, readdir, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, expect, it} from 'vitest'
import {
  RESEARCH_INSPECTION_VERSION,
  type ResearchReview,
  runInquiryResearch,
  selectInspectionContext,
} from '../../inspection/index'
import type {StoredKnowledgePoint} from '../../indexing/store'
import {readInspectionJournal, readInspectionLinks, writeInspectionLinks} from '../links'

const point = (id: string): StoredKnowledgePoint => ({
  payload: {
    contentHash: id,
    docId: id,
    path: `${id}.md`,
    relations: [],
    repoId: 'repo',
    status: 'active',
    tags: [],
    text: `Rule ${id}`,
    title: id,
    type: 'rule',
    unitId: 'main',
    workspaceId: 'main',
  },
  pointId: id,
})
const pair = {left: point('a'), right: point('b')}
const model = {digest: 'digest', name: 'test'}
const points = [pair.left, pair.right, point('c'), point('d')]
const assessment = {
  confidence: 0.5,
  kind: 'uncertain' as const,
  leftQuote: '',
  reason: 'Scope remains missing.',
  rightQuote: '',
}
const review = (): ResearchReview => ({
  initial: assessment,
  rounds: [
    {
      added: ['c', 'd'],
      decision: {citations: ['context-1-left-1'], proposed: assessment, unresolved: ['Scope?']},
      queries: [{hits: ['c', 'd'], query: 'scope'}],
      questions: ['Scope?'],
    },
  ],
  selection: selectInspectionContext({points: points.slice(2), questions: []}),
  stop: 'round-limit',
  unresolved: ['Scope?'],
})
let directory: string
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'knowledge-links-test-'))
})
afterEach(async () => {
  await rm(directory, {force: true, recursive: true})
})
const options = () => ({directory, model, pair, points})
it('should persist an empty search by question and invalidate history for another model', async () => {
  const result = await runInquiryResearch({
    assessor: async () => ({error: {code: 'should-not-assess-empty-evidence'}, ok: false}),
    initial: assessment,
    pair,
    planner: async (input) => ({
      ok: true,
      value: [{query: 'scope', questionId: input.inquiries[0].id}],
    }),
    points,
    questions: ['Scope?'],
    reader: {search: async () => ({ok: true, value: []})},
  })
  if (!result.ok) {
    throw new Error('Expected successful investigation')
  }
  await writeInspectionLinks({...options(), research: result.research})
  expect(await readInspectionJournal(options())).toEqual(result.research.journal)
  expect(await readInspectionLinks(options())).toEqual([])
  expect(
    await readInspectionJournal({...options(), model: {...model, digest: 'new'}}),
  ).toBeUndefined()
  const [name] = await readdir(join(directory, 'links'))
  const record = JSON.parse(await readFile(join(directory, 'links', name), 'utf8'))
  expect(record).toMatchObject({
    journal: {questions: [{attempts: [{query: 'scope'}], text: 'Scope?'}]},
    promptVersion: RESEARCH_INSPECTION_VERSION,
    version: 2,
  })
  await writeFile(
    join(directory, 'links', name),
    JSON.stringify({...record, promptVersion: RESEARCH_INSPECTION_VERSION - 1}),
  )
  expect(await readInspectionJournal(options())).toBeUndefined()
})

it('should persist cited excerpts and reason independently of pair order and model identity', async () => {
  expect(await readInspectionLinks(options())).toEqual([])
  await writeInspectionLinks({...options(), research: review()})
  expect(await readInspectionJournal(options())).toBeUndefined()
  expect(
    await readInspectionLinks({...options(), pair: {left: pair.right, right: pair.left}}),
  ).toEqual([point('c')])
  const [name] = await readdir(join(directory, 'links'))
  const saved = JSON.parse(await readFile(join(directory, 'links', name), 'utf8'))
  expect(saved).toMatchObject({
    links: [
      {passages: ['Rule c'], reason: assessment.reason, source: {contentHash: 'c', pointId: 'c'}},
    ],
    model,
    version: 1,
  })
  expect(saved.links).toHaveLength(1)
  expect(saved.pair).toEqual([
    {
      contentHash: 'a',
      docId: 'a',
      pointId: 'a',
      repoId: 'repo',
      unitId: 'main',
      workspaceId: 'main',
    },
    {
      contentHash: 'b',
      docId: 'b',
      pointId: 'b',
      repoId: 'repo',
      unitId: 'main',
      workspaceId: 'main',
    },
  ])
  const next = {...options(), model: {digest: 'changed', name: 'another'}}
  expect(await readInspectionLinks(next)).toEqual([point('c')])
})
it('should invalidate changed removed inactive foreign or mismatched sources and isolate pair changes', async () => {
  await writeInspectionLinks({...options(), research: review()})
  for (const payload of [
    {...point('c').payload, contentHash: 'changed'},
    {...point('c').payload, text: 'changed'},
    {...point('c').payload, status: 'deprecated' as const},
    {...point('c').payload, repoId: 'other'},
    {...point('c').payload, workspaceId: 'other'},
    {...point('c').payload, docId: 'other'},
  ]) {
    // eslint-disable-next-line no-await-in-loop -- Each case reads the same immutable record.
    expect(await readInspectionLinks({...options(), points: [{payload, pointId: 'c'}]})).toEqual([])
  }
  expect(await readInspectionLinks({...options(), points: []})).toEqual([])
  expect(await readInspectionLinks({...options(), pair: {...pair, right: point('new')}})).toEqual(
    [],
  )
})
it('should retain the previous record when storage becomes unwritable', async () => {
  await writeInspectionLinks({...options(), research: review()})
  const [name] = await readdir(join(directory, 'links'))
  const path = join(directory, 'links', name)
  const original = await readFile(path, 'utf8')
  await chmod(join(directory, 'links'), 0o500)
  try {
    await expect(writeInspectionLinks({...options(), research: review()})).rejects.toThrow()
  } finally {
    await chmod(join(directory, 'links'), 0o700)
  }
  expect(await readFile(path, 'utf8')).toBe(original)
  expect(await readdir(join(directory, 'links'))).toEqual([name])
})
it('should reject forged passages future schemas and mismatched pair keys', async () => {
  await writeInspectionLinks({...options(), research: review()})
  const [name] = await readdir(join(directory, 'links'))
  const path = join(directory, 'links', name)
  const record = JSON.parse(await readFile(path, 'utf8'))
  for (const value of [
    {...record, version: 2},
    {...record, key: 'another-pair'},
    {...record, links: [{...record.links[0], passages: ['not a source passage']}]},
  ]) {
    // eslint-disable-next-line no-await-in-loop -- Each malformed record is independently read.
    await writeFile(path, JSON.stringify(value))
    // eslint-disable-next-line no-await-in-loop
    await expect(readInspectionLinks(options())).rejects.toThrow()
  }
})
it('should replace links with the latest citations and clear rejected evidence', async () => {
  await writeInspectionLinks({...options(), research: review()})
  const research = review()
  await writeInspectionLinks({
    ...options(),
    research: {
      ...research,
      rounds: [
        ...research.rounds,
        {
          added: [],
          decision: {citations: ['context-2-left-1'], proposed: assessment, unresolved: ['Scope?']},
          queries: [],
          questions: [],
        },
      ],
    },
  })
  expect(await readInspectionLinks(options())).toEqual([point('d')])
  await writeInspectionLinks({
    ...options(),
    research: {
      ...research,
      reused: {
        added: ['d'],
        decision: {citations: [], proposed: assessment, unresolved: ['Scope?']},
      },
      rounds: [],
    },
  })
  expect(await readInspectionLinks(options())).toEqual([])
  expect(await readdir(join(directory, 'links'))).toHaveLength(1)
})
it('should reject non-file records and refuse to save citations without current source evidence', async () => {
  await expect(
    writeInspectionLinks({...options(), points: [], research: review()}),
  ).rejects.toThrow()
  await writeInspectionLinks({...options(), research: review()})
  const [name] = await readdir(join(directory, 'links'))
  const path = join(directory, 'links', name)
  await rm(path)
  await mkdir(path)
  await expect(readInspectionLinks(options())).rejects.toThrow()
})
it('should isolate changed comparison contents and workspace while ignoring object field order', async () => {
  await writeInspectionLinks({...options(), research: review()})
  const changed = {...pair.right, payload: {...pair.right.payload, contentHash: 'changed'}}
  expect(await readInspectionLinks({...options(), pair: {...pair, right: changed}})).toEqual([])
  const foreign = {...pair.right, payload: {...pair.right.payload, workspaceId: 'other'}}
  expect(await readInspectionLinks({...options(), pair: {...pair, right: foreign}})).toEqual([])
  const {workspaceId, ...rest} = pair.right.payload
  const reordered = {...pair.right, payload: {workspaceId, ...rest}}
  expect(await readInspectionLinks({...options(), pair: {...pair, right: reordered}})).toEqual([
    point('c'),
  ])
})
it('should reject malformed records and invalid citations instead of silently trusting them', async () => {
  const research = review()
  await expect(
    writeInspectionLinks({
      ...options(),
      research: {
        ...research,
        rounds: [
          {
            added: [],
            decision: {citations: ['invented'], proposed: assessment, unresolved: []},
            queries: [],
            questions: [],
          },
        ],
      },
    }),
  ).rejects.toThrow()
  await writeInspectionLinks({...options(), research})
  const [name] = await readdir(join(directory, 'links'))
  await writeFile(join(directory, 'links', name), '{}')
  await expect(readInspectionLinks(options())).rejects.toThrow()
})
