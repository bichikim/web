import {mkdirSync, mkdtempSync, realpathSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join} from 'node:path'

/** Creates overlapping project coverage with different alias targets and an uncovered consumer. */
export const createPreparationFixtures = () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'native-preparation-')))
  const documents: string[] = []
  const expected: string[] = []
  const write = (path: string, text: string, selected = false): void => {
    mkdirSync(dirname(join(root, path)), {recursive: true})
    writeFileSync(join(root, path), text)
    if (path.endsWith('.ts')) {
      documents.push(path)
    }
    if (selected) {
      for (const match of text.matchAll(/greet|parent|outside/gu)) {
        expected.push(JSON.stringify([path, 1, match.index + 1]))
      }
    }
  }
  write(
    'tsconfig.json',
    JSON.stringify({
      compilerOptions: {
        module: 'esnext',
        moduleResolution: 'bundler',
        noLib: true,
        paths: {'@public': ['./core/entry.ts']},
        types: [],
      },
      include: ['entry.ts', 'apps/covered.ts'],
    }),
  )
  write('entry.ts', 'export {}')
  write('core/tsconfig.json', JSON.stringify({extends: '../tsconfig.json', include: ['entry.ts']}))
  write('core/entry.ts', 'export function greet() {}')
  write('other/entry.ts', 'export function greet() {}')
  write(
    'apps/tsconfig.json',
    JSON.stringify({
      compilerOptions: {paths: {'@public': ['../other/entry.ts']}},
      extends: '../tsconfig.json',
      include: ['member.ts'],
    }),
  )
  write('apps/covered.ts', "import {greet as parent} from '@public'; parent()", true)
  write('apps/member.ts', "import {greet as unrelated} from '@public'; unrelated()")
  write('loose/consumer.ts', "import {greet as outside} from '../core/entry'; outside()", true)
  const DEFINITION_COLUMN = 17
  return [
    {
      documents,
      expected: expected.sort(),
      kind: 'references',
      name: 'overlapping-projects',
      needle: 'greet',
      root,
      target: 'core/entry.ts',
    },
    {
      documents,
      expected: [JSON.stringify(['core/entry.ts', 1, DEFINITION_COLUMN])],
      kind: 'definition',
      name: 'overlapping-projects-definition',
      needle: 'parent()',
      root,
      target: 'apps/covered.ts',
    },
  ]
}
