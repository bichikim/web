import {mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {expect, it} from 'vitest'
import {createWorkspace} from '../create-workspace'
import {resolveNavigation} from '../resolve-navigation'

it('should return complete sorted previews for usages in ten thousand unopened files', async () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'navigation-many-files-')))
  const workspace = createWorkspace(root)
  try {
    writeFileSync(join(root, 'tsconfig.json'), '{"compilerOptions":{"noLib":true,"types":[]}}')
    writeFileSync(join(root, 'helper.ts'), 'export const fanOut = (value: number) => value\n')
    mkdirSync(join(root, 'callers'))
    const paths = Array.from(
      {length: 10000},
      (_, index) => `callers/caller-${String(index).padStart(5, '0')}.ts`,
    )
    paths.forEach((path, index) =>
      writeFileSync(join(root, path), `import {fanOut} from '../helper'\nfanOut(${index})\n`),
    )
    const document = workspace.read('helper.ts')
    if (!document.ok) {
      throw new Error(document.error.code)
    }
    const result = await resolveNavigation({
      document: document.value,
      navigation: 'definition',
      offset: 13,
      path: 'helper.ts',
      workspace,
    })
    if (!result.ok) {
      throw new Error(result.error.code)
    }
    expect(result.value.kind).toBe('references')
    expect(result.value.locations).toEqual(
      paths.flatMap((path, index) => [
        {column: 9, line: 1, path, preview: `import {fanOut} from '../helper'\nfanOut(${index})`},
        {column: 1, line: 2, path, preview: `fanOut(${index})`},
      ]),
    )
    const stream = workspace.scanNavigation(
      {
        navigation: 'definition',
        offset: 13,
        path: 'helper.ts',
        revision: document.value.revision,
      },
      new AbortController().signal,
    )
    const first = await stream.next()
    expect(first.value?.groups?.length).toBeGreaterThan(0)
    // Direct import edges arrive before native call sites; completion must retain every location.
    expect(first.value?.groups?.length).toBeLessThanOrEqual(paths.length)
    expect(first.value?.groups).toEqual(
      paths.slice(0, first.value?.groups?.length).map((path) => ({count: 1, path})),
    )
    expect(first.value?.locations).toEqual([])
    const details = await stream.next()
    expect(details.value?.locations).toEqual(result.value.locations.slice(0, 1))
    expect(first.done).toBe(false)
    const remaining = await Array.fromAsync(stream)
    expect(remaining.length).toBeGreaterThan(1)
    expect(
      [...(details.value?.locations ?? []), ...remaining.flatMap((batch) => batch.locations)].sort(
        (left, right) =>
          left.path.localeCompare(right.path) ||
          left.line - right.line ||
          left.column - right.column,
      ),
    ).toEqual(result.value.locations)
    expect(
      remaining.findLast((batch) => batch.groups !== undefined)?.groups ?? first.value?.groups,
    ).toEqual(paths.map((path) => ({count: 2, path})))
  } finally {
    workspace.dispose()
    rmSync(root, {force: true, recursive: true})
  }
})
