import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import * as playerModule from '@winter-love/puppet/player'
import {createLibraryRepository} from '@winter-love/wallpaper/settings/library-repository'
import {builtinConnectionProfile} from '../../src/features/connection-profiles/builtin-profile'
import {SPoffoWidget} from '../../src/components/SPoffoWidget'
import {sendSemanticFrame} from '../../src/features/semantics/channel'
import {createSettingsRepository} from '@winter-love/wallpaper/settings/repository'
import 'virtual:uno.css'

vi.mock('@winter-love/puppet/player', async (importOriginal) => {
  const actual = await importOriginal<typeof playerModule>()
  return {...actual, createPlayer: vi.fn(actual.createPlayer)}
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

test('should toggle a widget pose and retain it through speech and remount', async () => {
  const actual = await vi.importActual<typeof playerModule>('@winter-love/puppet/player')
  let ready = Promise.withResolvers<playerModule.Player>()
  vi.mocked(playerModule.createPlayer).mockImplementation(async (options) => {
    const completion = ready
    try {
      const player = await actual.createPlayer(options)
      completion.resolve(player)
      return player
    } catch (cause) {
      completion.reject(cause)
      throw cause
    }
  })
  const repository = createLibraryRepository('wallpaper-library')
  const assets = createSettingsRepository('wallpaper-settings')
  const model = playerModule.createDemoDocument()
  const asset = await assets.addPuppet(
    'Menu character',
    JSON.stringify({
      ...model,
      expressions: [
        {
          composition: 'cubism',
          fadeInTime: 0,
          fadeOutTime: 0,
          id: '작아지기',
          name: 'Shrink',
          parameters: [{blend: 'add', parameterId: 'Param95', value: 1}],
        },
      ],
      parameters: [
        ...model.parameters!,
        {defaultValue: 0, id: 'Param95', maximum: 1, minimum: 0, name: 'Miniature'},
      ],
    }),
  )
  const widget = await repository.addWidget(asset.id)
  const shrink = builtinConnectionProfile('builtin:ash')!.connections.semanticBindings!.find(
    (binding) => binding.id === 'ash:shrink',
  )!
  await repository.configureSpeech(widget.id, {
    enabled: true,
    semanticBindings: [shrink],
    x: 0.9,
    y: 0.05,
  })
  let view = render(() => <SPoffoWidget id={widget.id} />)
  const openMenu = () => {
    const root = screen.getByRole('main', {name: 'Poffo 위젯'})
    fireEvent(
      root,
      new MouseEvent('pointerup', {
        bubbles: true,
        button: 2,
        clientX: innerWidth - 2,
        clientY: innerHeight - 2,
      }),
    )
    return screen.getByRole('menu', {name: 'Poffo 위젯 메뉴'})
  }
  try {
    const player = await ready.promise
    const menu = openMenu()
    const toggle = screen.getByRole('menuitemcheckbox', {name: '귀엽게 작아지기'})
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    const bounds = menu.getBoundingClientRect()
    expect(bounds.right).toBeLessThanOrEqual(innerWidth)
    expect(bounds.bottom).toBeLessThanOrEqual(innerHeight)
    await userEvent.keyboard('{End}')
    expect(document.activeElement).toBe(toggle)
    await userEvent.keyboard('{Enter}')
    await expect.poll(() => player.getParameterValue('Param95'), {timeout: 3000}).toBeCloseTo(1)
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('main', {name: 'Poffo 위젯'}))
    await sendSemanticFrame({narration: {phase: 'ended'}, scores: {}, widgetId: widget.id})
    expect(player.getParameterValue('Param95')).toBeCloseTo(1)
    await expect
      .poll(
        async () =>
          (await repository.read()).widgets.find((item) => item.id === widget.id)?.speech
            ?.semanticBindings?.[0]?.menuActive,
      )
      .toBe(true)
    view.unmount()
    ready = Promise.withResolvers<playerModule.Player>()
    view = render(() => <SPoffoWidget id={widget.id} />)
    const reopened = await ready.promise
    await expect.poll(() => reopened.getParameterValue('Param95'), {timeout: 3000}).toBeCloseTo(1)
    openMenu()
    const checked = screen.getByRole('menuitemcheckbox', {name: '귀엽게 작아지기'})
    expect(checked).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(checked)
    await expect.poll(() => reopened.getParameterValue('Param95'), {timeout: 3000}).toBeCloseTo(0)
    openMenu()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('main', {name: 'Poffo 위젯'}))
    expect(screen.queryByRole('alert')).toBeNull()
  } finally {
    view.unmount()
    await repository.removeWidget(widget.id)
    repository.close()
    await assets.removePuppet(asset.id)
    assets.close()
  }
}, 20_000)

test('should retry a checked menu motion on the next frame after its first start is rejected', async () => {
  const actual = await vi.importActual<typeof playerModule>('@winter-love/puppet/player')
  const ready = Promise.withResolvers<playerModule.Player>()
  const startMotion = vi.fn<playerModule.Player['startMotion']>()
  vi.mocked(playerModule.createPlayer).mockImplementation(async (options) => {
    try {
      const player = await actual.createPlayer(options)
      startMotion.mockImplementation(player.startMotion).mockReturnValueOnce(undefined)
      player.startMotion = startMotion
      ready.resolve(player)
      return player
    } catch (cause) {
      ready.reject(cause)
      throw cause
    }
  })
  const repository = createLibraryRepository('wallpaper-library')
  const assets = createSettingsRepository('wallpaper-settings')
  const model = playerModule.createDemoDocument()
  const asset = await assets.addPuppet(
    'Retry character',
    JSON.stringify({
      ...model,
      motions: [
        ...model.motions,
        {
          duration: 1,
          id: 'semantic-walk',
          tracks: [
            {
              keyframes: [{time: 0, value: 1}],
              kind: 'parameter',
              parameterId: 'walking',
            },
          ],
        },
      ],
      parameters: [
        ...model.parameters!,
        {defaultValue: 0, id: 'walking', maximum: 1, minimum: 0, name: 'Walking'},
      ],
    }),
  )
  const widget = await repository.addWidget(asset.id)
  await repository.configureSpeech(widget.id, {
    enabled: true,
    semanticBindings: [
      {
        action: {id: 'semantic-walk', kind: 'motion'},
        category: 'menu',
        enabled: true,
        id: 'walk',
        menuLabel: '걷기',
        mode: 'toggle',
        parameterId: null,
        text: '걷기',
        threshold: 0.8,
      },
    ],
    x: 0.9,
    y: 0.05,
  })
  const view = render(() => <SPoffoWidget id={widget.id} />)
  const openMenu = async () => {
    const root = screen.getByRole('main', {name: 'Poffo 위젯'})
    root.focus()
    await userEvent.keyboard('{Shift>}{F10}{/Shift}')
    return screen.getByRole('menuitemcheckbox', {name: '걷기'})
  }
  try {
    const player = await ready.promise
    await userEvent.click(await openMenu())
    await expect.poll(() => startMotion.mock.calls.length).toBe(1)
    expect(startMotion.mock.results[0]!.value).toBeUndefined()
    expect(player.getParameterValue('walking')).toBe(0)
    expect(await openMenu()).toHaveAttribute('aria-checked', 'true')
    await userEvent.keyboard('{Escape}')
    await sendSemanticFrame({scores: {}, widgetId: widget.id})
    await expect.poll(() => player.getParameterValue('walking')).toBe(1)
    expect(startMotion).toHaveBeenCalledTimes(2)
    await sendSemanticFrame({scores: {}, widgetId: widget.id})
    expect(startMotion).toHaveBeenCalledTimes(2)
    await userEvent.click(await openMenu())
    await expect.poll(() => player.getParameterValue('walking')).toBe(0)
    expect(screen.queryByRole('alert')).toBeNull()
  } finally {
    view.unmount()
    await repository.removeWidget(widget.id)
    repository.close()
    await assets.removePuppet(asset.id)
    assets.close()
  }
}, 20_000)
