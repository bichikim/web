// oxlint-disable no-await-in-loop -- Observe each transition on the same real player.
import {cleanup, render} from '@solidjs/testing-library'
import {For} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {page} from 'vitest/browser'
import {
  createPlayer,
  flushPlayerInputs,
  type Player,
  preparePuppetDocument,
} from '@winter-love/puppet/player'
import * as rendererModule from '../../../../packages/puppet/src/player/rendering/create-player-renderer'
import modelUrl from '../../../wallpaper-web/public/models/white-cat/model.poffo?url'
import 'virtual:uno.css'

vi.mock(
  '../../../../packages/puppet/src/player/rendering/create-player-renderer',
  async (original) => {
    const actual = await original<typeof rendererModule>()
    return {...actual, createPlayerRenderer: vi.fn(actual.createPlayerRenderer)}
  },
)

let player: Player | undefined
afterEach(() => {
  player?.destroy()
  player = undefined
  vi.clearAllMocks()
  cleanup()
})

interface Frame {
  readonly weight: number
  readonly gaps: ReadonlyArray<number>
}

interface Transition {
  readonly frames: Frame[]
  readonly complete: (frame: Frame) => boolean
  readonly resolve: (frames: ReadonlyArray<Frame>) => void
}

test.each([false, true])(
  'should keep the notebook hand and both elbows attached throughout action cross-fades (buffering=%s)',
  async (buffering) => {
    const prepared = await preparePuppetDocument({
      source: await fetch(modelUrl).then((response) => response.blob()),
    })
    if (!prepared.ok) {
      throw new Error('Invalid Ash model')
    }
    const document = prepared.document
    const contacts = [
      'coat-free:notes-left:elbow-center:contact',
      'coat-free:notes-right:elbow-center:contact',
      'coat-free:notes-right:wrist:contact',
    ].map((id) => document.glue!.find((glue) => glue.id === id)!)
    let canvas!: HTMLCanvasElement
    render(() => (
      <div class="h-125 w-100 bg-white">
        <canvas ref={canvas} aria-label="Notebook action transition" class="h-full w-full" />
      </div>
    ))
    let pending: Transition | undefined
    const pictures: {weight: number; image: string}[] = []
    let capture = false
    const observe = () => {
      if (pending === undefined) {
        return
      }
      const frame = readFrame()
      pending.frames.push(frame)
      if (capture && frame.weight >= [0.1, 0.3, 0.6, 0.95][pictures.length]!) {
        pictures.push({image: canvas.toDataURL(), weight: frame.weight})
      }
      if (pending.complete(frame)) {
        const completed = pending
        pending = undefined
        completed.resolve(completed.frames)
      }
    }
    player = await createPlayer({
      buffering,
      canvas,
      document,
      framing: 'viewport',
      onAfterRender: observe,
      parameterValues: {Param49: 1},
      physicsPreview: true,
      renderer: 'pixi-webgl',
      resolution: 1.5,
    })
    const current = player
    const renderer = await vi.mocked(rendererModule.createPlayerRenderer).mock.results.at(-1)!.value
    const readFrame = (): Frame => ({
      gaps: contacts.map((contact) => {
        const first = renderer.getPartVertices(contact.first.partId)!
        const second = renderer.getPartVertices(contact.second.partId)!
        return Math.hypot(
          ...[0, 1].map(
            (axis) =>
              first[contact.first.vertexIndex * 2 + axis]! -
              second[contact.second.vertexIndex * 2 + axis]!,
          ),
        )
      }),
      weight: current.getParameterValue('Param89') ?? 0,
    })
    const transition = (expressions: ReadonlyArray<string>, target: number) => {
      const completed = new Promise<ReadonlyArray<Frame>>((resolve) => {
        pending = {
          complete: (frame) => (target === 0 ? frame.weight <= 0.001 : frame.weight >= target),
          frames: [],
          resolve,
        }
      })
      expect(current.setExpressions(expressions)).toBe(true)
      current.resume()
      return completed
    }
    const assertAttached = (frames: ReadonlyArray<Frame>, phase: string) => {
      const visible = frames.filter((frame) => frame.weight > 0.01)
      const partial = visible.filter((frame) => frame.weight < 0.99)
      expect(partial.length, `${phase} must exercise the real fade`).toBeGreaterThan(1)
      for (const [index, contact] of contacts.entries()) {
        const worst = visible.reduce((previous, frame) =>
          frame.gaps[index]! > previous.gaps[index]! ? frame : previous,
        )
        expect(worst.gaps[index], `${phase}: ${contact.id} at weight ${worst.weight}`).toBeLessThan(
          0.01,
        )
      }
    }
    current.pause()
    current.setBreath(false)
    current.setEyeBlink(false)
    current.setViewCamera({x: 1700, y: 1100, zoom: 0.32})
    await flushPlayerInputs(current)
    capture = true
    const incoming = await transition(['노트 들기'], 0.999)
    capture = false
    current.pause()
    if (!buffering) {
      render(() => (
        <section aria-label="Notebook fade frames" class="flex w-225 bg-white">
          <For each={pictures}>
            {(picture) => (
              <figure class="m-0 w-1/4">
                <figcaption>{Math.round(picture.weight * 100)}%</figcaption>
                <img src={picture.image} alt="Notebook fade" class="w-full" />
              </figure>
            )}
          </For>
        </section>
      ))
      await page
        .getByRole('region', {name: 'Notebook fade frames'})
        .screenshot({path: '__screenshots__/ash-notebook-transition.png'})
    }
    assertAttached(incoming, 'Enter notebook')
    current.patchParameterValues({ParamAngleX: -30, ParamAngleZ: 20})
    assertAttached(await transition(['커피 들기'], 0), 'Cross-fade to coffee')
    current.patchParameterValues({ParamAngleX: 30, ParamAngleZ: -20})
    assertAttached(await transition(['노트 들기', '필기 동작'], 0.45), 'Interrupted entry')
    assertAttached(await transition([], 0), 'Reverse before entry completes')
    assertAttached(await transition(['노트 들기', '필기 동작'], 0.999), 'Re-enter while writing')
    current.pause()
  },
  30_000,
)
