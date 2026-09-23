import {randomUUID} from 'node:crypto'
import {mkdir, readFile, rename, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {z} from 'zod'
import type {RuleOutcome} from './types'

const outcomeSchema = z.discriminatedUnion('status', [
  z.object({ruleId: z.string(), status: z.literal('skip')}),
  z.object({
    answers: z
      .record(
        z.string(),
        z.discriminatedUnion('type', [
          z.object({probability: z.number().min(0).max(1), type: z.literal('noul')}),
          z.object({
            choice: z.string(),
            confidence: z.number().min(0).max(1),
            probabilities: z.record(z.string(), z.number().min(0).max(1)),
            type: z.literal('choice'),
          }),
        ]),
      )
      .optional(),
    probability: z.number().min(0).max(1),
    reason: z.string().optional(),
    ruleId: z.string(),
    state: z.json().optional(),
    status: z.enum(['fail', 'pass', 'uncertain']),
  }),
])

const isMissingFile = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT'

export class DecisionCache {
  private readonly resultsDirectory: string

  constructor(cacheDirectory: string) {
    this.resultsDirectory = path.join(cacheDirectory, 'results')
  }

  async read(key: string): Promise<RuleOutcome | undefined> {
    try {
      const serialized = await readFile(path.join(this.resultsDirectory, `${key}.json`), 'utf8')
      return outcomeSchema.parse(JSON.parse(serialized))
    } catch (error: unknown) {
      if (isMissingFile(error) || error instanceof SyntaxError || error instanceof z.ZodError) {
        return undefined
      }
      throw error
    }
  }

  async write(key: string, outcome: RuleOutcome): Promise<void> {
    await mkdir(this.resultsDirectory, {recursive: true})
    const destination = path.join(this.resultsDirectory, `${key}.json`)
    const temporary = path.join(this.resultsDirectory, `.${key}.${process.pid}.${randomUUID()}.tmp`)
    await writeFile(temporary, `${JSON.stringify(outcome)}\n`)
    await rename(temporary, destination)
  }
}
