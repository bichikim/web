import {expect, it} from 'vitest'
import {readToolLocation} from '../read-tool-location'

it('should follow the actual text Read location', () => {
  expect(
    readToolLocation(
      {file_path: '/project/input.ts', tool: 'Read'},
      {
        result: {file: {filePath: '/project/actual.ts', startLine: 12}, type: 'text'},
      },
    ),
  ).toEqual({column: 1, line: 12, path: '/project/actual.ts'})
})
it('should use the requested Read offset when no starting line was returned', () => {
  expect(
    readToolLocation(
      {file_path: '/project/input.ts', offset: 7, tool: 'Read'},
      {
        result: {file: {}, type: 'text'},
      },
    ),
  ).toEqual({column: 1, line: 7, path: '/project/input.ts'})
})
it('should locate the first actual edit after patch context lines', () => {
  expect(
    readToolLocation(
      {file_path: '/project/main.ts', tool: 'Edit'},
      {
        result: {structuredPatch: [{lines: [' context', ' context', '-old', '+new'], newStart: 9}]},
      },
    ),
  ).toEqual({column: 1, line: 11, path: '/project/main.ts'})
})
it('should follow a new Write at the first line and an update at its patch location', () => {
  const input = {file_path: '/project/new.ts', tool: 'Write'}
  expect(readToolLocation(input, {result: {type: 'create'}})).toEqual({
    column: 1,
    line: 1,
    path: '/project/new.ts',
  })
  expect(
    readToolLocation(input, {
      result: {
        structuredPatch: [{lines: [' context', '+new'], newStart: 4}],
        type: 'update',
      },
    }),
  ).toEqual({column: 1, line: 5, path: '/project/new.ts'})
})
it('should ignore denied, failed, staged and subagent operations', () => {
  const input = {file_path: '/project/main.ts', tool: 'Edit'}
  for (const result of [{deny: 'blocked'}, {isError: true}, {result: {staged: true}}]) {
    expect(readToolLocation(input, result)).toBeUndefined()
  }
  expect(readToolLocation({...input, agentId: 'worker'}, {result: {}})).toBeUndefined()
})
it('should ignore images, unrelated tools and malformed paths or positions', () => {
  expect(
    readToolLocation(
      {file_path: '/project/image.png', tool: 'Read'},
      {
        result: {file: {}, type: 'image'},
      },
    ),
  ).toBeUndefined()
  expect(readToolLocation({tool: 'Bash'}, {result: {}})).toBeUndefined()
  expect(
    readToolLocation({file_path: '', tool: 'Write'}, {result: {type: 'create'}}),
  ).toBeUndefined()
  expect(
    readToolLocation(
      {file_path: '/project/main.ts', offset: 0, tool: 'Read'},
      {
        result: {file: {}, type: 'text'},
      },
    ),
  ).toBeUndefined()
})
