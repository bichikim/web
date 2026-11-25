// oxlint-disable no-await-in-loop -- A single player verifies the authored poses in sequence.
import {cleanup, render} from '@solidjs/testing-library'
import {afterEach, expect, test} from 'vitest'
import {
  createPlayer,
  flushPlayerInputs,
  getScenePartStates,
  type Player,
  preparePuppetDocument,
  type PuppetSceneNode,
} from '@winter-love/puppet/player'
import modelUrl from '../../../wallpaper-web/public/models/white-cat/model.poffo?url'
import 'virtual:uno.css'

let player: Player | undefined

afterEach(() => {
  player?.destroy()
  player = undefined
  cleanup()
})

const flatten = (nodes: ReadonlyArray<PuppetSceneNode>): PuppetSceneNode[] =>
  nodes.flatMap((node) => [node, ...(node.kind === 'part' ? [] : flatten(node.children))])

const garmentIds = new Set([
  ...[
    119, 120, 121, 122, 123, 124, 127, 130, 131, 132, 133, 134, 135, 141, 44, 45, 51, 52, 53, 64,
    29, 30, 33, 886, 883, 882,
  ].map((id) => `ArtMesh${id}`),
  ...[850, 851, 854, 19, 20, 23, 92].map((id) => `ArtMesh${id}_Skinning`),
])

const poses = [
  '노트 들기',
  '커피 들기',
  '마이크 들기',
  '손하트',
  '엄지 척',
  '고양이 손',
  '칼 들기',
  '주먹 쥐기',
  '게임패드 들기',
  '수갑 찬 손',
  '컵라면 들기',
] as const

const armPoints = new Map([
  ['노트 들기', {name: 'notes-left', x: 121, y: 187}],
  ['커피 들기', {name: 'coffee-left', x: 140, y: 180}],
  ['손하트', {name: 'heart-right', x: 270, y: 180}],
])

test.each([false, true])(
  'should hide posed sleeves while retaining bare arms (buffering=%s)',
  async (buffering) => {
    let canvas!: HTMLCanvasElement
    render(() => (
      <div class="h-150 w-100">
        <canvas ref={canvas} aria-label="Ash wardrobe" class="h-full w-full" />
      </div>
    ))
    const source = await fetch(modelUrl).then((response) => response.blob())
    const prepared = await preparePuppetDocument({source})
    if (!prepared.ok) {
      throw new Error('Invalid Ash model')
    }
    const document = prepared.document
    const posed = flatten(document.scene!.roots).find((node) => node.id === 'Part3')!
    const garments = flatten([posed]).filter(
      (node) =>
        garmentIds.has(node.id) ||
        (node.kind === 'group' &&
          node.id.startsWith('ArtMesh') &&
          /Sleeve|Cuff|Corner Cloth/.test(node.name)),
    )
    const clothing = garments.flatMap((node) =>
      flatten([node])
        .filter((child) => child.kind === 'part')
        .map((child) => child.id),
    )
    expect(clothing.length).toBeGreaterThan(100)
    player = await createPlayer({
      buffering,
      canvas,
      document,
      framing: 'viewport',
      physicsPreview: false,
      renderer: 'pixi-webgl',
      resolution: 1.5,
    })
    const current = player
    current.pause()
    current.setEyeBlink(false)
    current.setBreath(false)
    current.setViewCamera({x: 1400, y: 1000, zoom: 0.2})
    for (const pose of poses) {
      const action = document.expressions!.find((expression) => expression.id === pose)!
      const values = Object.fromEntries(
        action.parameters.map((parameter) => [parameter.parameterId, parameter.value]),
      )
      current.setParameterValues({...values, Param49: 0})
      await flushPlayerInputs(current)
      current.redraw()
      const coated = canvas.toDataURL()
      current.setParameterValues({...values, Param49: 1})
      await flushPlayerInputs(current)
      current.redraw()
      const states = new Map(
        getScenePartStates(document, current.getParameterValues()).map((state) => [
          state.partId,
          state.visible,
        ]),
      )
      expect(
        clothing.every((id) => states.get(id) === false),
        pose,
      ).toBe(true)
      expect(canvas.toDataURL(), pose).not.toBe(coated)
      const point = armPoints.get(pose)
      if (point !== undefined) {
        expect(current.pickPart(point), pose).toMatch(new RegExp(`^coat-free:${point.name}:`))
      }
    }
  },
  60_000,
)
