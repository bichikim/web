import {readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {prepareRecipeDirectory} from './prepare-recipe-directory'
import {hashValue} from '../backend/hash-value'
import {resolveWorkspacePath} from '../backend/node/resolve-workspace-path'
import {
  createRecipeContext,
  hashRecipeEngine,
  type RecipeContext,
  type RecipeOptions,
} from './create-recipe-context'
import {type Recipe, type RecipeReport, recipeReportSchema, recipeSchema} from './recipe-types'

const restoreReport = async (context: RecipeContext, report: RecipeReport) => {
  await context.verifyArtifact(report.checkpoint)
  await Promise.all(report.artifacts.map(context.verifyArtifact))
  if (report.output !== undefined) {
    await context.verifyArtifact(report.output)
  }
  const status = await context.execute('status')
  const opened = await context.execute('document.open', {
    expectedRevision: status.revision,
    path: report.checkpoint.path,
  })
  return opened.revision
}

const runStep = async (
  context: RecipeContext,
  step: Recipe['steps'][number],
  expectedRevision: number,
) => {
  switch (step.type) {
    case 'patch': {
      const preview = await context.execute('edit.preview', {
        expectedRevision,
        patch: step.patch,
      })
      const checked = context.previewSchema.parse(preview.value)
      return {
        result: await context.execute('edit.apply', {
          ...checked,
          patch: step.patch,
          title: step.title,
        }),
      }
    }
    case 'render': {
      const result = await context.execute('view.render', {
        ...step,
        expectedRevision,
      })
      if (result.revision !== expectedRevision) {
        throw new Error('stale-revision: model changed during recipe render')
      }
      return {artifact: await context.artifact(step.path), result}
    }
    default: {
      const unreachable: never = step
      throw new Error(`Unknown recipe step: ${String(unreachable)}`)
    }
  }
}

/** Runs ordered declarative steps. A completed step is recorded only after its checkpoint is persisted. */
export const runRecipe = async (options: RecipeOptions) => {
  const recipe = recipeSchema.parse(
    JSON.parse(
      await readFile(await resolveWorkspacePath(options.workspace, options.path, 'read'), 'utf8'),
    ),
  )
  const context = createRecipeContext(options)
  const engineHash = await hashRecipeEngine()
  const recipeHash = await hashValue(recipe)
  const {hash: inputHash} = await context.artifact(recipe.input)
  const identifier = await hashValue({inputHash, recipeHash})
  const directory = await prepareRecipeDirectory(options.workspace, identifier)
  const reportPath = join(directory, 'report.json')
  const stored = await readFile(join(options.workspace, reportPath), 'utf8').catch(
    (error: unknown) => {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return undefined
      }
      throw error
    },
  )
  if (stored !== undefined && options.resume !== true) {
    throw new Error(`recipe-exists: resume using ${options.path} --resume`)
  }
  if (stored === undefined && options.resume === true) {
    throw new Error('resume-missing: no matching recipe and input checkpoint')
  }
  let revision: number
  let report: RecipeReport
  if (stored === undefined) {
    const status = await context.execute('status')
    const opened = await context.execute('document.open', {
      expectedRevision: status.revision,
      path: recipe.input,
    })
    revision = opened.revision
    const checkpoint = await context.checkpoint(join(directory, '0.poffo'), revision)
    report = {
      artifacts: [],
      checkpoint,
      complete: false,
      completed: 0,
      engineHash,
      inputHash,
      recipeHash,
      version: 1,
    }
    await context.writeReport(reportPath, report)
  } else {
    report = recipeReportSchema.parse(JSON.parse(stored))
    if (
      report.engineHash !== engineHash ||
      report.inputHash !== inputHash ||
      report.recipeHash !== recipeHash ||
      report.completed > recipe.steps.length
    ) {
      throw new Error('resume-mismatch: recipe or input changed')
    }
    revision = await restoreReport(context, report)
  }
  try {
    await recipe.steps.slice(report.completed).reduce<Promise<void>>(async (previous, step) => {
      await previous
      const executed = await runStep(context, step, revision)
      revision = executed.result.revision
      const completed = report.completed + 1
      const checkpoint = await context.checkpoint(
        join(directory, `${completed}.poffo`),
        executed.result.revision,
      )
      report = {
        ...report,
        artifacts:
          executed.artifact === undefined
            ? report.artifacts
            : [...report.artifacts, executed.artifact],
        checkpoint,
        completed,
        error: undefined,
      }
      await context.writeReport(reportPath, report)
    }, Promise.resolve())
    if (!report.complete) {
      await context.execute('document.save', {...recipe.output, expectedRevision: revision})
      report = {
        ...report,
        complete: true,
        error: undefined,
        output: await context.artifact(recipe.output.path),
      }
      await context.writeReport(reportPath, report)
    }
    return {report, reportPath}
  } catch (error) {
    await context.writeReport(reportPath, {
      ...report,
      error: error instanceof Error ? error.message : 'recipe-failed',
    })
    throw error
  }
}
