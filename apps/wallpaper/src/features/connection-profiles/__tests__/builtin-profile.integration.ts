import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {expect, it} from 'vitest'
import {builtinConnectionProfile} from '../builtin-profile'
import type {TrackingParameter} from '../../tracking/types'

it('should bind the bundled preset to actual expressive Ash parameters within their ranges', async () => {
  // A separate Node process uses the codec's Node exports instead of Vitest's browser conditions.
  const script = `
    import {readFile} from 'node:fs/promises';
    const {preparePuppetDocument} = await import(process.argv[1]);
    const result = await preparePuppetDocument({source: new Blob([await readFile(process.argv[2])])});
    if (!result.ok) throw new Error('Invalid bundled character');
    console.log(JSON.stringify({parameters: result.document.parameters,
      bindings: result.document.parameterBindings.map(binding => binding.parameterIds)}));
  `
  const {stdout} = await promisify(execFile)(process.execPath, [
    '--input-type=module',
    '-e',
    script,
    new URL('../../../../../../packages/puppet/dist/player.js', import.meta.url).href,
    new URL('../../../../../wallpaper-web/public/models/white-cat/model.poffo', import.meta.url)
      .pathname,
  ])
  const document: {
    readonly parameters: readonly TrackingParameter[]
    readonly bindings: readonly (readonly string[])[]
  } = JSON.parse(stdout)
  const profile = builtinConnectionProfile('builtin:ash')!
  for (const binding of profile.connections.semanticBindings ?? []) {
    const parameter = document.parameters.find((item) => item.id === binding.parameterId)
    expect(parameter, binding.id).toBeDefined()
    expect(binding.from).toBeGreaterThanOrEqual(parameter!.minimum)
    expect(binding.to).toBeLessThanOrEqual(parameter!.maximum)
    expect(document.bindings.some((ids) => ids.includes(parameter!.id))).toBe(true)
  }
  expect(builtinConnectionProfile('builtin:profile')).toBeUndefined()
})
