import {expect, it} from 'vitest'
import {createClaudeEnvironment} from '../create-claude-environment'

it('should preserve the default Claude profile without introducing a config override', () => {
  const environment = {PATH: '/bin'}
  expect(
    createClaudeEnvironment({defaultHome: '/user/.claude', environment, home: '/user/.claude'}),
  ).toEqual(environment)
})

it('should isolate an explicitly selected alternative configuration folder', () => {
  expect(
    createClaudeEnvironment({
      defaultHome: '/user/.claude',
      environment: {PATH: '/bin'},
      home: '/test/.claude',
    }),
  ).toEqual({CLAUDE_CONFIG_DIR: '/test/.claude', PATH: '/bin'})
})

it('should retain an explicit config override even when it matches the default folder', () => {
  const environment = {CLAUDE_CONFIG_DIR: '/user/.claude'}
  expect(
    createClaudeEnvironment({defaultHome: '/user/.claude', environment, home: '/user/.claude'}),
  ).toEqual(environment)
})
