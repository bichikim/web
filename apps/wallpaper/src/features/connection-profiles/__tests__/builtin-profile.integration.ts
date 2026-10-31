import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {expect, it} from 'vitest'
import {builtinConnectionProfile} from '../builtin-profile'

it('should bind the bundled preset to actual character actions', async () => {
  // A separate Node process uses the codec's Node exports instead of Vitest's browser conditions.
  const script = `
    import {readFile} from 'node:fs/promises';
    const {preparePuppetDocument} = await import(process.argv[1]);
    const result = await preparePuppetDocument({source: new Blob([await readFile(process.argv[2])])});
    if (!result.ok) throw new Error('Invalid bundled character');
    console.log(JSON.stringify({
      expressions: result.document.expressions.map(item => item.id),
      motions: result.document.motions.map(item => item.id)
    }));
  `
  const {stdout} = await promisify(execFile)(process.execPath, [
    '--input-type=module',
    '-e',
    script,
    new URL('../../../../../../packages/puppet/dist/player.js', import.meta.url).href,
    new URL('../../../../../wallpaper-web/public/models/white-cat/model.poffo', import.meta.url)
      .pathname,
  ])
  const document: {readonly expressions: readonly string[]; readonly motions: readonly string[]} =
    JSON.parse(stdout)
  const profile = builtinConnectionProfile('builtin:ash')!
  for (const binding of profile.connections.semanticBindings ?? []) {
    const action = binding.action!
    const ids = action.kind === 'expression' ? document.expressions : document.motions
    expect(ids, binding.id).toContain(action.id)
    expect(binding.parameterId).toBeNull()
  }
  expect(builtinConnectionProfile('builtin:profile')).toBeUndefined()
})
