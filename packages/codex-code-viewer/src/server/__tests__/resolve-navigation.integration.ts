import {mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {createWorkspace} from '../create-workspace'
import {resolveNavigation} from '../resolve-navigation'

describe('resolveNavigation declaration boundaries', () => {
  let root: string
  let workspace: ReturnType<typeof createWorkspace>
  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'navigation-boundaries-')))
    mkdirSync(join(root, '.git'))
    writeFileSync(join(root, 'tsconfig.json'), '{"compilerOptions":{"noLib":true,"types":[]}}')
    workspace = createWorkspace(root)
  })
  afterEach(() => {
    workspace.dispose()
    rmSync(root, {force: true, recursive: true})
  })
  const declarations = [
    {name: 'r#type', path: 'main.rs', source: 'fn r#type() {}\nfn main() {r#type();}'},
    {
      name: '\\u0061nswer',
      path: 'main.ts',
      source: 'export const \\u0061nswer = 1\nconsole.log(answer)',
    },
  ]
  it.each(
    declarations.flatMap((entry) =>
      [false, true].flatMap((draft) =>
        [0, 2, entry.name.length - 1].map((relative) => ({...entry, draft, relative})),
      ),
    ),
  )('should find $name usages at offset $relative with draft=$draft', async (entry) => {
    writeFileSync(join(root, entry.path), entry.source)
    const document = workspace.read(entry.path)
    if (!document.ok) {
      throw new Error(document.error.code)
    }
    const source = entry.draft ? `\n${entry.source}` : entry.source
    expect(
      await resolveNavigation({
        document: document.value,
        navigation: 'definition',
        offset: source.indexOf(entry.name) + entry.relative,
        path: entry.path,
        sources: entry.draft ? [{path: entry.path, source}] : [],
        workspace,
      }),
    ).toMatchObject({
      ok: true,
      value: {
        kind: 'references',
        locations: [expect.objectContaining({line: entry.draft ? 3 : 2, path: entry.path})],
      },
    })
  })
})
