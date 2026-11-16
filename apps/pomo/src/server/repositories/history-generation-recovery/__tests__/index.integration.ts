/** @vitest-environment node */
import {PGlite} from '@electric-sql/pglite'
import {eq} from 'drizzle-orm'
import {CasingCache} from 'drizzle-orm/casing'
import {drizzle} from 'drizzle-orm/pglite'
import {afterAll, afterEach, beforeAll, expect, it, vi} from 'vitest'
import {type Database, historicalGenerationRuns} from '../../../database'
import {expireGenerationSubmission, listRecoverableGenerationRuns} from '..'

vi.mock('src/env', () => ({env: {}}))

const CUTOFFS = {
  preparingBefore: new Date('2026-08-15T00:00:00.000Z'),
  submissionExpiredBefore: new Date('2026-08-15T00:30:00.000Z'),
  submittedBefore: new Date('2026-08-15T00:00:00.000Z'),
}
const FIRST_ID = '00000000-0000-4000-8000-000000000001'
const SECOND_ID = '00000000-0000-4000-8000-000000000002'
const STATUS_VALUES = historicalGenerationRuns.status.enumValues
const STATE_VALUES = [null, ...historicalGenerationRuns.submissionState.enumValues] as const
const EXPIRY_VALUES = [
  null,
  new Date(CUTOFFS.submissionExpiredBefore.getTime() - 1),
  CUTOFFS.submissionExpiredBefore,
  new Date(CUTOFFS.submissionExpiredBefore.getTime() + 1),
]
const UPDATE_VALUES = [-1, 0, 1].map(
  (offset) => new Date(CUTOFFS.preparingBefore.getTime() + offset),
)
const postgres = new PGlite()
const database = drizzle(postgres, {casing: 'snake_case'})
// This subset fixture executes real SQL with production column codecs and enum/nullability metadata.
const repository = database as unknown as Database

beforeAll(async () => {
  const enums = [historicalGenerationRuns.status, historicalGenerationRuns.submissionState]
  const enumDefinitions = enums.map(
    (column) =>
      `CREATE TYPE "${column.getSQLType()}" AS ENUM (${column.enumValues.map((value) => `'${value}'`).join(',')})`,
  )
  const columns = [
    historicalGenerationRuns.id,
    historicalGenerationRuns.status,
    historicalGenerationRuns.openAiResponseId,
    historicalGenerationRuns.submissionState,
    historicalGenerationRuns.submissionExpiresAt,
    historicalGenerationRuns.updatedAt,
  ]
  const casing = new CasingCache('snake_case')
  const definitions = columns.map((column) => {
    const name = casing.getColumnCasing(column)
    return `"${name}" ${column.getSQLType()}${column.notNull ? ' NOT NULL' : ''}`
  })
  await postgres.exec(
    `${enumDefinitions.join(';')};
    CREATE TABLE historical_generation_runs (${definitions.join(',')}, PRIMARY KEY (id))`,
  )
})

afterEach(async () => {
  await postgres.exec('TRUNCATE historical_generation_runs')
})

afterAll(async () => {
  await postgres.close()
})

interface RunFixture {
  readonly id: string
  readonly responseId: string | null
  readonly status: (typeof STATUS_VALUES)[number]
  readonly submissionState: (typeof STATE_VALUES)[number]
  readonly expiresAt: Date | null
  readonly updatedAt: Date
}

const insertRun = async (run: RunFixture) => {
  await postgres.query(
    `INSERT INTO historical_generation_runs
      (id, open_ai_response_id, status, submission_state, submission_expires_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6)`,
    [run.id, run.responseId, run.status, run.submissionState, run.expiresAt, run.updatedAt],
  )
}

const readRun = async (id: string) => {
  const [run] = await database
    .select({
      id: historicalGenerationRuns.id,
      responseId: historicalGenerationRuns.openAiResponseId,
      status: historicalGenerationRuns.status,
      submissionState: historicalGenerationRuns.submissionState,
      updatedAt: historicalGenerationRuns.updatedAt,
    })
    .from(historicalGenerationRuns)
    .where(eq(historicalGenerationRuns.id, id))
  return run
}

const createRun = (id = FIRST_ID): RunFixture => ({
  expiresAt: CUTOFFS.submissionExpiredBefore,
  id,
  responseId: null,
  status: 'preparing',
  submissionState: 'unknown',
  updatedAt: CUTOFFS.preparingBefore,
})

const assertExpirationCase = async (row: RunFixture) => {
  const {expiresAt, responseId, status, submissionState, updatedAt} = row
  await postgres.exec('TRUNCATE historical_generation_runs')
  await insertRun(row)
  const eligible =
    status === 'preparing' &&
    responseId === null &&
    (submissionState === 'unknown'
      ? expiresAt !== null && expiresAt <= CUTOFFS.submissionExpiredBefore
      : submissionState === null && updatedAt < CUTOFFS.preparingBefore)
  const recoverableResponse =
    status === 'submitted' && responseId !== null && updatedAt < CUTOFFS.submittedBefore
  const expected = eligible
    ? [{kind: 'submission_unknown', runId: FIRST_ID}]
    : recoverableResponse
      ? [{kind: 'response', responseId}]
      : []
  const context = JSON.stringify(row)
  await expect(listRecoverableGenerationRuns(CUTOFFS, repository), context).resolves.toEqual(
    expected,
  )
  await expect(expireGenerationSubmission(FIRST_ID, CUTOFFS, repository), context).resolves.toBe(
    eligible,
  )
  const stored = await readRun(FIRST_ID)
  expect(stored, context).toMatchObject({
    id: FIRST_ID,
    responseId,
    status,
    submissionState: eligible ? 'expired' : submissionState,
  })
  if (!eligible) {
    expect(stored.updatedAt, context).toEqual(updatedAt)
  }
}

it.each(STATUS_VALUES)(
  'should preserve the complete expiration boundary matrix for %s',
  async (status) => {
    const cases = STATE_VALUES.flatMap((submissionState) =>
      [null, 'provider-response'].flatMap((responseId) =>
        EXPIRY_VALUES.flatMap((expiresAt) =>
          UPDATE_VALUES.map((updatedAt) => ({
            expiresAt,
            id: FIRST_ID,
            responseId,
            status,
            submissionState,
            updatedAt,
          })),
        ),
      ),
    )
    for (const row of cases) {
      // oxlint-disable-next-line no-await-in-loop -- Each case replaces the same table and checks its subsequent state.
      await assertExpirationCase(row)
    }
  },
)

it('should expire only the requested id among multiple eligible runs', async () => {
  await insertRun(createRun(FIRST_ID))
  await insertRun(createRun(SECOND_ID))
  await expect(expireGenerationSubmission(FIRST_ID, CUTOFFS, repository)).resolves.toBe(true)
  expect(await readRun(FIRST_ID)).toMatchObject({submissionState: 'expired'})
  expect(await readRun(SECOND_ID)).toMatchObject({submissionState: 'unknown'})
})

it('should preserve recovery ordering and the ten-run limit', async () => {
  const ids = Array.from(
    {length: 12},
    (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  )
  await Promise.all(
    ids.map((id, index) =>
      insertRun({
        ...createRun(id),
        expiresAt: new Date(CUTOFFS.submissionExpiredBefore.getTime() - index),
      }),
    ),
  )
  await expect(listRecoverableGenerationRuns(CUTOFFS, repository)).resolves.toEqual(
    [...ids]
      .reverse()
      .slice(0, 10)
      .map((runId) => ({kind: 'submission_unknown', runId})),
  )
})

it.each([
  {
    change: {openAiResponseId: 'accepted-response', status: 'submitted'},
    initialState: 'unknown',
    name: 'an accepted response',
  },
  {
    change: {submissionExpiresAt: new Date(CUTOFFS.submissionExpiredBefore.getTime() + 1)},
    initialState: 'unknown',
    name: 'an extended deadline',
  },
  {
    change: {updatedAt: CUTOFFS.preparingBefore},
    initialState: null,
    name: 'a refreshed legacy run',
  },
] as const)('should recheck $name after the recovery scan', async ({initialState, change}) => {
  await insertRun({...createRun(), submissionState: initialState, updatedAt: UPDATE_VALUES[0]})
  await expect(listRecoverableGenerationRuns(CUTOFFS, repository)).resolves.toEqual([
    {kind: 'submission_unknown', runId: FIRST_ID},
  ])
  await database
    .update(historicalGenerationRuns)
    .set(change)
    .where(eq(historicalGenerationRuns.id, FIRST_ID))
  const beforeExpiration = await readRun(FIRST_ID)
  await expect(expireGenerationSubmission(FIRST_ID, CUTOFFS, repository)).resolves.toBe(false)
  expect(await readRun(FIRST_ID)).toEqual(beforeExpiration)
})
