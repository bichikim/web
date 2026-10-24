import {expect, it} from 'vitest'
import {isProjectFile} from '../is-project-file'

it('should resolve relative and escaped project paths at the actual directory boundary', () => {
  expect(isProjectFile('src/example.ts', '/project folder')).toBe(true)
  expect(isProjectFile('/project folder/src/a#b?.ts', '/project folder')).toBe(true)
  expect(isProjectFile('/project-other/main.ts', '/project')).toBe(false)
  expect(isProjectFile('../outside.txt', '/project')).toBe(false)
  expect(isProjectFile('/project/../outside.txt', '/project')).toBe(false)
  expect(isProjectFile('/private/tmp/code-viewer-context.txt', '/project')).toBe(false)
})
