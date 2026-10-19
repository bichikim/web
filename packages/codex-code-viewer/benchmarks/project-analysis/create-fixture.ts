import {mkdirSync, mkdtempSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join} from 'node:path'
import {z} from 'zod'
import typescript from '@typescript/typescript6'

const variant = z.enum(['shared', 'paths', 'declarations']).parse(process.argv[2])
const PROJECT_COUNT = 8
const FILES_PER_PROJECT = 250
const root = mkdtempSync(join(tmpdir(), `project-analysis-${variant}-`))
const write = (path: string, text: string): void => {
  const file = join(root, path)
  mkdirSync(dirname(file), {recursive: true})
  writeFileSync(file, text)
}
write(
  'tsconfig.json',
  JSON.stringify({
    compilerOptions: {
      baseUrl: '.',
      module: 'esnext',
      moduleResolution: 'bundler',
      noLib: true,
      paths: {'@core': ['packages/core/entry.ts']},
      types: [],
    },
  }),
)
write('packages/core/entry.ts', 'export function greet() {}')
write('packages/core/local.ts', "import {greet as local} from './entry'; local()")
write(
  'packages/core/tsconfig.json',
  JSON.stringify({
    compilerOptions:
      variant === 'declarations'
        ? {
            composite: true,
            declaration: true,
            declarationMap: true,
            noEmit: false,
            outDir: './dist',
            rootDir: '.',
          }
        : {},
    exclude: ['dist'],
    extends: '../../tsconfig.json',
  }),
)
write('packages/bridge/tsconfig.json', '{"extends":"../../tsconfig.json"}')
write('packages/bridge/entry.ts', "export {greet as welcome} from '@core'")
write('packages/bridge/next.ts', "export {welcome as invoke} from './entry'")
write(
  'apps/consumer/tsconfig.json',
  JSON.stringify({
    compilerOptions:
      variant === 'paths'
        ? {
            paths: {
              '@core': ['packages/core/entry.ts'],
              '@public': ['packages/bridge/next.ts'],
            },
          }
        : {},
    extends: '../../tsconfig.json',
  }),
)
const module = variant === 'paths' ? '@public' : '../../packages/bridge/next'
write('apps/consumer/use.ts', `import {invoke as hello} from '${module}'; hello()`)
write(
  'apps/consumer/namespace.ts',
  "import * as api from '../../packages/bridge/entry'; api.welcome()",
)
write('loose/use.ts', "import {greet as outside} from '../packages/core/entry'; outside()")
if (variant === 'declarations') {
  typescript
    .createProgram([join(root, 'packages/core/entry.ts')], {
      composite: true,
      declaration: true,
      declarationMap: true,
      emitDeclarationOnly: true,
      noLib: true,
      outDir: join(root, 'packages/core/dist'),
      rootDir: join(root, 'packages/core'),
      types: [],
    })
    .emit()
  write(
    'apps/built/tsconfig.json',
    JSON.stringify({
      compilerOptions: {paths: {'@built/core': ['packages/core/dist/entry.d.ts']}},
      extends: '../../tsconfig.json',
      references: [{path: '../../packages/core'}],
    }),
  )
  write('apps/built/use.ts', "import {greet as built} from '@built/core'; built()")
}
for (let project = 0; project < PROJECT_COUNT; project += 1) {
  write(`packages/unrelated-${project}/tsconfig.json`, '{"extends":"../../tsconfig.json"}')
  for (let index = 0; index < FILES_PER_PROJECT; index += 1) {
    write(`packages/unrelated-${project}/source-${index}.ts`, 'export const greet = 2')
  }
}
console.log(root)
