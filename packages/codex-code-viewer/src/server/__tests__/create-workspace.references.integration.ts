import {mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {createWorkspace} from '../create-workspace'

describe('createWorkspace references', () => {
  let root: string
  let workspace: ReturnType<typeof createWorkspace>
  const definition = 'export const greet = (name: string) => name\n'
  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'viewer-references-')))
    mkdirSync(join(root, '.git'))
    writeFileSync(join(root, 'tsconfig.json'), '{"compilerOptions":{"noLib":true,"types":[]}}')
    writeFileSync(join(root, 'helper.ts'), definition)
    writeFileSync(
      join(root, 'main.ts'),
      "import {greet as welcome} from './helper'\nwelcome('one')\n",
    )
    writeFileSync(join(root, 'other.ts'), "import {greet} from './helper'\ngreet('two')\n")
    writeFileSync(join(root, 'unrelated.ts'), 'const greet = 1; console.log(greet)\n')
    workspace = createWorkspace(root)
  })
  afterEach(() => {
    workspace.dispose()
    rmSync(root, {force: true, recursive: true})
  })
  it('should find unopened usages and aliases without unrelated names', async () => {
    const result = await workspace.references('helper.ts', definition.indexOf('greet'))
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error(result.error.code)
    }
    expect(result.value).toEqual(
      expect.arrayContaining([
        {column: 1, line: 2, path: 'main.ts'},
        {column: 1, line: 2, path: 'other.ts'},
      ]),
    )
    expect(
      result.value.some((location) => ['helper.ts', 'unrelated.ts'].includes(location.path)),
    ).toBe(false)
  })
  it('should use unsaved usage text and reflect files created and removed after the first query', async () => {
    await workspace.references('helper.ts', definition.indexOf('greet'))
    writeFileSync(join(root, 'later.ts'), "import {greet} from './helper'\ngreet('later')\n")
    rmSync(join(root, 'other.ts'))
    const result = await workspace.references('helper.ts', definition.indexOf('greet'), [
      {path: 'main.ts', source: "import {greet} from './helper'\n\ngreet('draft')\n"},
    ])
    expect(result).toMatchObject({ok: true})
    if (!result.ok) {
      throw new Error(result.error.code)
    }
    expect(result.value).toEqual(
      expect.arrayContaining([
        {column: 1, line: 3, path: 'main.ts'},
        {column: 1, line: 2, path: 'later.ts'},
      ]),
    )
    expect(result.value.some((location) => location.path === 'other.ts')).toBe(false)
  })
  it('should support JavaScript usages without a tsconfig', async () => {
    workspace.dispose()
    rmSync(join(root, 'tsconfig.json'))
    mkdirSync(join(root, 'scripts'))
    writeFileSync(join(root, 'scripts/helper.js'), 'export const greet = () => 1')
    writeFileSync(join(root, 'scripts/usage.js'), "import {greet} from './helper.js'\ngreet()")
    workspace = createWorkspace(root)
    expect(await workspace.references('scripts/helper.js', 13)).toMatchObject({
      ok: true,
      value: expect.arrayContaining([{column: 1, line: 2, path: 'scripts/usage.js'}]),
    })
  })
  it('should return an empty list for unused definitions and reject invalid drafts or positions', async () => {
    writeFileSync(join(root, 'unused.ts'), 'export const unused = 1')
    expect(await workspace.references('unused.ts', 13)).toEqual({ok: true, value: []})
    expect(await workspace.references('helper.ts', definition.length)).toMatchObject({
      error: {code: 'invalid-position'},
      ok: false,
    })
    expect(
      await workspace.references('helper.ts', 13, [{path: '../outside.ts', source: 'x'}]),
    ).toMatchObject({error: {code: 'outside-workspace'}, ok: false})
  })
})
