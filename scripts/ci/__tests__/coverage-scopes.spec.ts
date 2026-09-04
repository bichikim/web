import {mkdtemp, readFile, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

import {describe, expect, test} from 'vitest'

import {selectCoverageScopes, writeCoverageScopeOutputs} from '../coverage-scopes.mjs'

describe('selectCoverageScopes', () => {
  test('should select only Pomo for Pomo application and audio gateway changes', () => {
    expect(
      selectCoverageScopes([
        'apps/pomo/src/routes/index.tsx',
        'apps/pomo-audio-gateway/src/index.ts',
      ]),
    ).toEqual({coong: false, pomo: true, workspace: false})
  })

  test('should select only Coong for Coong changes', () => {
    expect(selectCoverageScopes(['apps/coong/src/routes/index.tsx'])).toEqual({
      coong: true,
      pomo: false,
      workspace: false,
    })
  })

  test('should select the workspace for other application, package, and script changes', () => {
    expect(
      selectCoverageScopes([
        'apps/sidebuy/src/index.ts',
        'packages/utils/src/index.ts',
        'scripts/npm-release/run.mjs',
        '.agents/skills/unit-test/scripts/validate.mjs',
      ]),
    ).toEqual({coong: false, pomo: false, workspace: true})
  })

  test('should combine independently affected scopes', () => {
    expect(
      selectCoverageScopes([
        'apps/coong/src/index.tsx',
        'apps/pomo/src/index.tsx',
        'packages/player/src/index.ts',
      ]),
    ).toEqual({coong: true, pomo: true, workspace: true})
  })

  test('should select every scope for shared test configuration and dependency changes', () => {
    for (const path of [
      '.github/workflows/checks.yml',
      '.github/actions/install/action.yml',
      'package.json',
      'pnpm-lock.yaml',
      'pnpm-workspace.yaml',
      'scripts/ci/coverage-scopes.mjs',
      'turbo.json',
      'tsconfig.json',
      'vite.config.mts',
      'vitest.base.config.mts',
      'vitest.build-integration.config.mts',
      'vitest.d.ts',
      'vitest.setup.ts',
      'vitest.source-coverage.config.mts',
      'vitest.stress.config.mts',
      'patches/example.patch',
    ]) {
      expect(selectCoverageScopes([path])).toEqual({coong: true, pomo: true, workspace: true})
    }
  })

  test('should select no coverage scope for unrelated documentation', () => {
    expect(selectCoverageScopes(['README.md', 'docs/testing.md'])).toEqual({
      coong: false,
      pomo: false,
      workspace: false,
    })
  })

  test('should write selected GitHub Actions outputs and fall back to every scope at the API limit', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'coverage-scopes-'))
    const outputPath = join(directory, 'github-output')

    try {
      await writeCoverageScopeOutputs({
        limitReached: false,
        outputPath,
        paths: ['apps/pomo/src/index.tsx'],
      })
      await writeCoverageScopeOutputs({limitReached: true, outputPath, paths: []})

      expect(await readFile(outputPath, 'utf8')).toBe(
        [
          'coong=false',
          'pomo=true',
          'workspace=false',
          'coong=true',
          'pomo=true',
          'workspace=true',
          '',
        ].join('\n'),
      )
    } finally {
      await rm(directory, {force: true, recursive: true})
    }
  })
})
