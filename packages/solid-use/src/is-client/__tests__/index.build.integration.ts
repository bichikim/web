/** @vitest-environment node */

import {execFileSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {beforeAll, describe, expect, it} from 'vitest'

const packageDirectory = fileURLToPath(new URL('../../../', import.meta.url))
const readClientState = `
  import {createRoot} from 'solid-js'
  import {useIsClient} from '@winter-love/solid-use/is-client'
  const states = createRoot((dispose) => {
    const isClient = useIsClient()
    const before = isClient()
    dispose()
    return [before, isClient()]
  })
  process.stdout.write(JSON.stringify(states))
`

describe('useIsClient built package', () => {
  beforeAll(() => {
    execFileSync('pnpm', ['build'], {cwd: packageDirectory, encoding: 'utf8'})
  })

  it.each([
    {conditions: [], environment: 'server', expected: false},
    {conditions: ['--conditions=browser'], environment: 'browser', expected: true},
  ])('should preserve $environment detection after a library build', ({conditions, expected}) => {
    const output = execFileSync(
      process.execPath,
      [...conditions, '--input-type=module', '--eval', readClientState],
      {cwd: packageDirectory, encoding: 'utf8'},
    )
    expect(JSON.parse(output)).toEqual([expected, expected])
  })
})
