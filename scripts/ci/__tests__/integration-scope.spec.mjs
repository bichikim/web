import assert from 'node:assert/strict'
import {test} from 'node:test'
import {selectIntegrationScope} from '../integration-scope.mjs'

const WALLPAPER_DEPLOY = '.github/workflows/wallpaper-web-deploy.yml'
const FULL_SCOPE = {
  directories: [],
  projects: ['integration', 'wallpaper-web-browser', 'pomo-album-editor-browser'],
}

test('should skip shared integration when only deployment workflows change', () => {
  assert.deepEqual(
    selectIntegrationScope([WALLPAPER_DEPLOY, '.github/workflows/slowcove-deploy.yml'], () => {
      assert.fail('The package graph is unnecessary for deployment workflows')
    }),
    {directories: [], projects: []},
  )
})

test('should include impacted consumers and their browser projects', () => {
  assert.deepEqual(
    selectIntegrationScope([WALLPAPER_DEPLOY, 'packages/puppet/src/player.ts'], () => [
      'packages/puppet',
      'apps/wallpaper-web',
      'apps/poffo',
    ]),
    {
      directories: ['apps/poffo', 'apps/wallpaper-web', 'packages/puppet'],
      projects: ['integration', 'wallpaper-web-browser'],
    },
  )
})

test('should select the Pomo browser project for a Pomo change', () => {
  assert.deepEqual(
    selectIntegrationScope(['apps/pomo/src/app.tsx'], () => ['apps/pomo']),
    {
      directories: ['apps/pomo'],
      projects: ['integration', 'pomo-album-editor-browser'],
    },
  )
})

test('should include the root integration test for Oxlint plugin changes', () => {
  assert.deepEqual(
    selectIntegrationScope(['packages/oxlint-plugins/rules/index.ts'], () => [
      'packages/oxlint-plugins',
    ]),
    {directories: ['__tests__', 'packages/oxlint-plugins'], projects: ['integration']},
  )
})

test('should run all integration projects for common CI, configuration, or lockfile changes', () => {
  for (const file of [
    '.github/workflows/checks.yml',
    'vitest.integration.config.mts',
    'pnpm-lock.yaml',
  ]) {
    assert.deepEqual(
      selectIntegrationScope([WALLPAPER_DEPLOY, file], () => []),
      FULL_SCOPE,
    )
  }
})

test('should run all integration projects when the package graph cannot cover a changed file', () => {
  assert.deepEqual(
    selectIntegrationScope(['apps/removed/src/index.ts'], () => ['apps/pomo']),
    FULL_SCOPE,
  )
  assert.deepEqual(
    selectIntegrationScope(['apps/pomo/src/index.ts'], () => []),
    FULL_SCOPE,
  )
})
