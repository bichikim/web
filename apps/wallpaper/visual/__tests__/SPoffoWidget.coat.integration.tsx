import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeAll, expect, test, vi} from 'vitest'
import * as playerModule from '@winter-love/puppet/player'
import * as rendererModule from '../../../../packages/puppet/src/player/rendering/create-player-renderer'
import {SPoffoWidget} from '../../src/components/SPoffoWidget'
import ashUrl from '../../../wallpaper-web/public/models/white-cat/model.poffo?url'
import {page, userEvent} from 'vitest/browser'
import {createBuiltinLibrary} from '../../src/features/builtin-assets/create-builtin-library'
import {sendSemanticFrame} from '../../src/features/semantics/channel'
import 'virtual:uno.css'

let ashDocument: playerModule.PreparedPuppetDocument | null = null
let ashBlob: Blob
let tick: (deltaTime: number) => void = () => undefined
// Asset preparation is shared; every interaction still uses the actual validated model and renderer.
vi.mock('../../src/features/background/use-puppet-document', () => ({
  usePuppetDocument: () => ({document: () => ashDocument, ready: () => ashDocument !== null}),
}))
beforeAll(async () => {
  ashBlob = await fetch(ashUrl).then((response) => response.blob())
  const prepared = await playerModule.preparePuppetDocument({source: ashBlob})
  if (!prepared.ok) {
    throw new Error('Ash fixture could not be prepared')
  }
  ashDocument = prepared.document
})
vi.mock('../../src/features/poffo/use-widget-hit-test', () => ({
  useWidgetHitTest: () => ({afterRender: () => undefined}),
}))
vi.mock('@tauri-apps/api/core', async (original) => ({
  ...(await original<typeof import('@tauri-apps/api/core')>()),
  invoke: vi.fn(async () => undefined),
  isTauri: () => false,
}))
vi.mock('@tauri-apps/api/window', async (original) => ({
  ...(await original<typeof import('@tauri-apps/api/window')>()),
  getCurrentWindow: () => ({
    outerPosition: vi.fn(async () => ({x: 0, y: 0})),
    scaleFactor: vi.fn(async () => 1),
    setPosition: vi.fn(),
  }),
}))
vi.mock('@winter-love/puppet/player', async (original) => {
  const actual = await original<typeof playerModule>()
  return {...actual, createPlayer: vi.fn(actual.createPlayer)}
})
vi.mock(
  '../../../../packages/puppet/src/player/rendering/create-player-renderer',
  async (original) => {
    const actual = await original<typeof rendererModule>()
    return {
      ...actual,
      createPlayerRenderer: vi.fn(async (options) => {
        const renderer = await actual.createPlayerRenderer(options)
        // Advance the real expression fades at explicit frame boundaries.
        return {
          ...renderer,
          subscribeFrame: (listener: (deltaTime: number) => void) => {
            tick = listener
          },
        }
      }),
    }
  },
)
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

test('should toggle the authored coat action from the context menu alongside other groups and persist it', async () => {
  expect(
    ashDocument!.expressions!.find((expression) => expression.id === '외투 벗기'),
  ).toMatchObject({
    parameters: [{blend: 'overwrite', parameterId: 'Param49', value: 1}],
  })
  const actual = await vi.importActual<typeof playerModule>('@winter-love/puppet/player')
  let ready = Promise.withResolvers<playerModule.Player>()
  vi.mocked(playerModule.createPlayer).mockImplementation(async (options) => {
    const completion = ready
    try {
      const player = await actual.createPlayer({...options, buffering: false})
      completion.resolve(player)
      return player
    } catch (cause) {
      completion.reject(cause)
      throw cause
    }
  })
  const repository = createBuiltinLibrary('wallpaper-library')
  const widget = await repository.addWidget('builtin:ash')
  let view = render(() => <SPoffoWidget id={widget.id} />)
  const openMenu = () => {
    fireEvent(
      screen.getByRole('main', {name: 'Poffo 위젯'}),
      new PointerEvent('pointerup', {
        bubbles: true,
        button: 2,
        clientX: 480,
        clientY: 180,
        pointerType: 'mouse',
      }),
    )
    return screen.getByRole('menu', {name: 'Poffo 위젯 메뉴'})
  }
  const waitLayer = async (layer: ReturnType<typeof vi.spyOn>, id: string) => {
    await expect.poll(() => layer.mock.calls.some(([, action]) => action === id)).toBe(true)
    tick(1.1)
    await playerModule.flushPlayerInputs(await ready.promise)
  }
  try {
    const player = await ready.promise
    player.pause()
    player.setPhysicsPreview(false)
    const layer = vi.spyOn(player, 'setExpressionLayer')
    openMenu()
    const coat = screen.getByRole('menuitemcheckbox', {name: 'Remove Coat'})
    expect(coat).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(coat)
    await waitLayer(layer, '외투 벗기')
    expect(player.getParameterValue('Param49')).toBe(1)
    openMenu()
    expect(screen.getByRole('menuitemcheckbox', {name: 'Remove Coat'})).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await page
      .getByRole('main', {name: 'Poffo 위젯'})
      .screenshot({path: '__screenshots__/ash-coat-menu-enabled.png'})
    fireEvent.click(screen.getByRole('menuitemcheckbox', {name: 'Shrink'}))
    await waitLayer(layer, '작아지기')
    expect(player.getParameterValue('Param49')).toBe(1)
    expect(player.getParameterValue('Param95')).toBe(1)
    await sendSemanticFrame({scores: {'ash:angry': 1}, widgetId: widget.id})
    await waitLayer(layer, '화남')
    expect(player.getParameterValue('Param68')).toBe(1)
    expect(player.getParameterValue('Param49')).toBe(1)
    expect(player.getParameterValue('Param95')).toBe(1)
    openMenu()
    fireEvent.click(screen.getByRole('menuitemcheckbox', {name: 'Remove Coat'}))
    await expect
      .poll(() => layer.mock.calls.filter(([, action]) => action === undefined).length)
      .toBeGreaterThan(0)
    tick(1.1)
    await playerModule.flushPlayerInputs(await ready.promise)
    expect(player.getParameterValue('Param49')).toBe(0)
    expect(player.getParameterValue('Param68')).toBe(1)
    expect(player.getParameterValue('Param95')).toBe(1)
    layer.mockClear()
    openMenu()
    fireEvent.click(screen.getByRole('menuitemcheckbox', {name: 'Remove Coat'}))
    await waitLayer(layer, '외투 벗기')
    await expect
      .poll(
        async () =>
          (await repository.read()).widgets
            .find((item) => item.id === widget.id)
            ?.speech?.semanticBindings?.find((binding) => binding.id === 'ash:remove-coat')
            ?.menuActive,
      )
      .toBe(true)
    view.unmount()
    ready = Promise.withResolvers<playerModule.Player>()
    view = render(() => <SPoffoWidget id={widget.id} />)
    const reopened = await ready.promise
    reopened.pause()
    reopened.setPhysicsPreview(false)
    const reopenedLayer = vi.spyOn(reopened, 'setExpressionLayer')
    openMenu()
    await expect
      .poll(() =>
        screen.getByRole('menuitemcheckbox', {name: 'Remove Coat'}).getAttribute('aria-checked'),
      )
      .toBe('true')
    await waitLayer(reopenedLayer, '외투 벗기')
    expect(reopened.getParameterValue('Param49')).toBe(1)
    expect(reopened.getParameterValue('Param95')).toBe(1)
    await expect
      .poll(
        () =>
          screen.getByRole<HTMLButtonElement>('menuitemcheckbox', {name: 'Remove Coat'}).disabled,
      )
      .toBe(false)
    fireEvent.click(screen.getByRole('menuitemcheckbox', {name: 'Remove Coat'}))
    await expect
      .poll(
        async () =>
          (await repository.read()).widgets
            .find((item) => item.id === widget.id)
            ?.speech?.semanticBindings?.find((binding) => binding.id === 'ash:remove-coat')
            ?.menuActive,
        {timeout: 5000},
      )
      .toBe(false)
    await expect
      .poll(
        () => {
          tick(1.1)
          return reopened.getParameterValue('Param49')
        },
        {timeout: 5000},
      )
      .toBe(0)
    expect(reopened.getParameterValue('Param95')).toBe(1)
    expect(screen.queryByRole('alert')).toBeNull()
  } finally {
    view.unmount()
    await repository.removeWidget(widget.id)
    repository.close()
  }
})
