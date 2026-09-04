import {appendFile} from 'node:fs/promises'
import {pathToFileURL} from 'node:url'

const allScopes = Object.freeze({coong: true, pomo: true, workspace: true})

const isGlobalTestInput = (path) =>
  path === '.github/workflows/checks.yml' ||
  path === 'package.json' ||
  path === 'pnpm-lock.yaml' ||
  path === 'pnpm-workspace.yaml' ||
  path === 'scripts/ci/coverage-scopes.mjs' ||
  path === 'turbo.json' ||
  path === 'tsconfig.json' ||
  path === 'vite.config.mts' ||
  path === 'vitest.base.config.mts' ||
  path === 'vitest.build-integration.config.mts' ||
  path === 'vitest.d.ts' ||
  path === 'vitest.setup.ts' ||
  path === 'vitest.source-coverage.config.mts' ||
  path === 'vitest.stress.config.mts' ||
  path.startsWith('.github/actions/') ||
  path.startsWith('patches/')

/** Selects the independently runnable source-coverage scopes affected by repository paths. */
export const selectCoverageScopes = (paths) => {
  const scopes = {coong: false, pomo: false, workspace: false}

  for (const path of paths) {
    if (isGlobalTestInput(path)) {
      return allScopes
    }

    if (path.startsWith('apps/pomo/') || path.startsWith('apps/pomo-audio-gateway/')) {
      scopes.pomo = true
    } else if (path.startsWith('apps/coong/')) {
      scopes.coong = true
    } else if (
      path.startsWith('apps/') ||
      path.startsWith('packages/') ||
      path.startsWith('scripts/') ||
      path.startsWith('.agents/skills/')
    ) {
      scopes.workspace = true
    }
  }

  return Object.freeze(scopes)
}

/** Writes GitHub Actions outputs for the coverage scopes selected from changed paths. */
export const writeCoverageScopeOutputs = async ({limitReached, outputPath, paths}) => {
  const scopes = limitReached ? allScopes : selectCoverageScopes(paths)
  const output = Object.entries(scopes)
    .map(([scope, selected]) => `${scope}=${String(selected)}`)
    .join('\n')

  await appendFile(outputPath, `${output}\n`)
  console.info(`Selected coverage scopes: ${JSON.stringify(scopes)}`)
}

const run = async () => {
  const outputPath = process.env.GITHUB_OUTPUT

  if (outputPath === undefined) {
    throw new Error('GITHUB_OUTPUT is required.')
  }

  await writeCoverageScopeOutputs({
    limitReached: process.env.CHANGED_FILES_LIMIT_REACHED === 'true',
    outputPath,
    paths: JSON.parse(process.env.CHANGED_PATHS ?? '[]'),
  })
}

/* v8 ignore start -- GitHub Actions exercises this environment-to-function CLI boundary. */
if (process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await run()
}
/* v8 ignore stop */
