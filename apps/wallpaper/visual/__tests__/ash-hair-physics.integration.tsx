// oxlint-disable no-await-in-loop -- Each player's input revisions must reach the displayed frame in order.
import {cleanup, render} from '@solidjs/testing-library'
import {afterEach, beforeAll, expect, test} from 'vitest'
import {page} from 'vitest/browser'
import {
  createPlayer,
  flushPlayerInputs,
  type Player,
  type PreparedPuppetDocument,
  preparePuppetDocument,
} from '@winter-love/puppet/player'
import modelUrl from '../../../wallpaper-web/public/models/white-cat/model.poffo?url'
import 'virtual:uno.css'

let document: PreparedPuppetDocument
const players: Player[] = []
beforeAll(async () => {
  const source = await fetch(modelUrl).then((response) => response.blob())
  const prepared = await preparePuppetDocument({source})
  if (!prepared.ok) {
    throw new Error('Invalid Ash model')
  }
  document = prepared.document
})
afterEach(() => {
  players.splice(0).forEach((player) => player.destroy())
  cleanup()
})

const sides = [
  {ids: [2, 7, 8, 9, 10].map((id) => `Param_Angle_Rotation${id}`), side: 'left'},
  {ids: [11, 12, 13, 14, 15].map((id) => `Param_Angle_Rotation${id}`), side: 'right'},
]
const cases = sides.flatMap((side) => [false, true].map((buffering) => ({...side, buffering})))
const sideIds = [19, 20, 21, 22, 23, 24].map((id) => `Param${id}`)

test.each(cases)(
  'should release $side ponytail without exciting side hair (buffering=$buffering)',
  async ({ids, side, buffering}) => {
    let canvas!: HTMLCanvasElement
    render(() => (
      <div class="h-125 w-125 bg-stone-100">
        <canvas ref={canvas} class="h-full w-full" aria-label="Ash hair physics" />
      </div>
    ))
    let observe: (() => void) | undefined
    const player = await createPlayer({
      buffering,
      canvas,
      document,
      framing: 'viewport',
      onFrame: () => observe?.(),
      physicsPreview: true,
      randomSeed: 42,
      renderer: 'pixi-webgl',
    })
    players.push(player)
    player.pause()
    player.setBreath(false)
    player.setEyeBlink(false)
    player.setViewCamera({x: 1100, y: 0, zoom: 0.2})
    player.setParameterValues(
      Object.fromEntries(
        document.parameters!.map((parameter) => [parameter.id, parameter.defaultValue]),
      ),
    )
    player.resetPhysics()
    await flushPlayerInputs(player)
    const rest = sideIds.map((id) => player.getParameterValue(id)!)
    player.patchParameterBlends(
      Object.fromEntries(
        ids.map((id, index) => [
          id,
          {mode: 'overwrite' as const, value: [15, -10, 15, -10, 15][index]!},
        ]),
      ),
      'interaction',
    )
    await flushPlayerInputs(player)
    expect(Math.abs(player.getParameterValue(ids[0]!)!)).toBeGreaterThan(1)
    expect(player.releaseParameterPhysics(ids)).toEqual(expect.arrayContaining(ids))
    await flushPlayerInputs(player)
    const first = player.getParameterValue(ids[0]!)!
    let maximumSide = Math.max(
      ...sideIds.map((id, index) => Math.abs(player.getParameterValue(id)! - rest[index]!)),
    )
    let maximumPonytail = 0
    let count = 0
    const frames = Promise.withResolvers<void>()
    observe = () => {
      maximumSide = Math.max(
        maximumSide,
        ...sideIds.map((id, index) => Math.abs(player.getParameterValue(id)! - rest[index]!)),
      )
      maximumPonytail = Math.max(
        maximumPonytail,
        Math.abs(player.getParameterValue(ids[0]!)! - first),
      )
      count += 1
      if (count >= 18) {
        frames.resolve()
      }
    }
    player.resume()
    await frames.promise
    observe = undefined
    player.pause()
    await flushPlayerInputs(player)
    await page.screenshot({path: `__screenshots__/ash-hair-release-${side}-${buffering}.png`})
    expect(maximumPonytail).toBeGreaterThan(0.01)
    expect(maximumSide).toBeLessThan(0.00001)
  },
  30_000,
)
