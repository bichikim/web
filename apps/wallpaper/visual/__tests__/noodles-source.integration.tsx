import {cleanup, render} from '@solidjs/testing-library'
import {test} from 'vitest'
import {page} from 'vitest/browser'
import {createPlayer, flushPlayerInputs, preparePuppetDocument} from '@winter-love/puppet/player'
import source from '../../.cache/characters/noodles-hand/before.poffo?url'
import 'virtual:uno.css'
test('capture the actual original hand and arm', async () => {
  const result = await preparePuppetDocument({source: await fetch(source).then((r) => r.blob())})
  if (!result.ok) {
    throw Error('model')
  }
  const d = result.document
  d.parameterBindings!.push({
    id: 'source-bare',
    interpolation: 'grid',
    keyforms: [0, 1].map((coat) => ({
      parts: ['ArtMesh48', 'ArtMesh49'].map((id) => ({
        partId: id,
        properties: {opacity: 1 - coat},
        vertices: d.parts.find((p) => p.id === id)!.mesh.vertices,
      })),
      values: [coat],
    })),
    parameterIds: ['Param49'],
    targetPartIds: ['ArtMesh48', 'ArtMesh49'],
  })
  for (const id of ['coat-free:noodles-left:ArtMesh900', 'coat-free:noodles-left:ArtMesh901']) {
    d.parts.find((p) => p.id === id)!.properties.clippingMaskIds = ['ArtMesh46']
  }
  let canvas!: HTMLCanvasElement
  render(() => (
    <section aria-label="Hand source" class="h-175 w-225 bg-white">
      <canvas ref={canvas} class="h-full w-full" />
    </section>
  ))
  const player = await createPlayer({
    canvas,
    document: d,
    framing: 'viewport',
    physicsPreview: false,
    renderer: 'pixi-webgl',
    resolution: 1.5,
  })
  player.pause()
  player.setBreath(false)
  player.setEyeBlink(false)
  const expression = d.expressions!.find((e) => e.id === '컵라면 들기')!
  const values = {
    ...Object.fromEntries(d.parameters!.map((p) => [p.id, p.defaultValue])),
    ...Object.fromEntries(expression.parameters.map((p) => [p.parameterId, p.value])),
    Param49: 1,
  }
  player.patchParameterBlends(
    Object.fromEntries(
      Object.entries(values).map(([id, value]) => [id, {mode: 'overwrite' as const, value}]),
    ),
    'after-physics',
  )
  player.setViewCamera({x: 1930, y: 1450, zoom: 1.6})
  await flushPlayerInputs(player)
  await page.getByRole('region', {name: 'Hand source'}).screenshot({path: 'noodles-source.png'})
  player.destroy()
  cleanup()
}, 30000)
