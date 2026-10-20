import {expect, it} from 'vitest'
import {parseInstallCommand} from '../parse-install-command'

it('should request a choice for an interactive install', () => {
  expect(parseInstallCommand(['install'], true)).toEqual({command: 'install', target: 'choose'})
  expect(parseInstallCommand([], true)).toEqual({command: 'install', target: 'choose'})
})

it('should retain Codex as the noninteractive default', () => {
  expect(parseInstallCommand(['install'], false)).toEqual({command: 'install', target: 'codex'})
})

it.each(['codex', 'claude', 'all'])(
  'should accept the explicit %s target without a prompt',
  (target) => {
    expect(parseInstallCommand(['install', '--target', target], false)).toEqual({
      command: 'install',
      target,
    })
  },
)

it.each([['--help'], ['-h'], ['install', '--help']])('should show help for %j', (...args) => {
  expect(parseInstallCommand(args, false)).toEqual({command: 'help'})
})

it.each([
  ['install', '--target'],
  ['install', '--target', 'unknown'],
  ['install', '--target', 'claude', '--extra'],
  ['remove'],
])('should reject invalid arguments %j before installation', (...args) => {
  expect(() => parseInstallCommand(args, true)).toThrow('지원하지 않는 명령')
})

it.each([
  ['install', '--install-codex'],
  ['install', '--target', 'codex', '--install-codex'],
  ['install', '--install-codex', '--target', 'codex'],
])('should accept explicit CLI installation with %j', (...args) => {
  expect(parseInstallCommand(args, false)).toEqual({
    command: 'install',
    installCodex: true,
    target: 'codex',
  })
})
it('should reject duplicate CLI installation flags', () => {
  expect(() =>
    parseInstallCommand(['install', '--install-codex', '--install-codex'], false),
  ).toThrow()
})
