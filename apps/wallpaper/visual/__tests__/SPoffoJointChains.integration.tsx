import Dexie from 'dexie'
import {cleanup, fireEvent, render, screen, within} from '@solidjs/testing-library'
import {createStore, reconcile} from 'solid-js/store'
import {afterEach, expect, test} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import {DEFAULT_POFFO_TOUCH, type PoffoTouch} from '@winter-love/wallpaper/settings/touch'
import {touchJointChains} from '@winter-love/wallpaper/settings/touch-joint-chains'
import {DEFAULT_POFFO_SPEECH} from '@winter-love/wallpaper/settings/library-model'
import {createLibraryRepository} from '@winter-love/wallpaper/settings/library-repository'
import {SPoffoTouchSettings} from '../../src/components/SPoffoTouchSettings'
import 'virtual:uno.css'
const names: string[] = []
const repositories: ReturnType<typeof createLibraryRepository>[] = []
afterEach(async () => {
  cleanup()
  repositories.splice(0).forEach((repository) => repository.close())
  await Promise.all(names.splice(0).map((name) => Dexie.delete(name)))
})

test('should configure variable-length tail and ear connections at 320px', async () => {
  const database = `joint-editor-${crypto.randomUUID()}`
  names.push(database)
  const repository = createLibraryRepository(database)
  repositories.push(repository)
  let writer = repository
  const widget = await repository.addWidget('custom-model')
  const [state, setState] = createStore<{touch: PoffoTouch}>({
    touch: {...DEFAULT_POFFO_TOUCH, enabled: true},
  })
  const save = async (patch: PoffoTouch) => {
    await writer.configureSpeech(widget.id, {...DEFAULT_POFFO_SPEECH, touch: patch})
    setState('touch', reconcile(patch))
  }
  const parameters = ['tail0', 'tail1', 'tail2', 'tail3', 'ear0', 'ear1', 'handXY'].map((id) => ({
    axis: 'x' as const,
    defaultValue: 0,
    dimensions: 1,
    id,
    joint: id !== 'handXY',
    maximum: 30,
    minimum: -30,
    name: id === 'handXY' ? 'Left Hand X' : `관절 ${id}`,
    parts: [id.startsWith('ear') ? 'ear' : 'tail'],
  }))
  render(() => (
    <div class="box-border w-80 bg-white p-3">
      <SPoffoTouchSettings
        value={state.touch}
        onChange={save}
        source={{
          error: () => null,
          loading: () => false,
          parameters: () => parameters,
          touchParameters: () => parameters,
        }}
      />
    </div>
  ))
  expect(screen.queryByRole('switch', {name: '관절 자동 계산'})).toBeNull()
  const configure = async (name: string, ids: readonly string[]) => {
    const back = screen.queryByRole('button', {name: '터치 목록으로'})
    if (back !== null) {
      await userEvent.click(back)
    }
    await userEvent.click(screen.getByRole('button', {name: '+ 관절 연결'}))
    await expect.poll(() => touchJointChains(state.touch).length).toBe(name === '꼬리' ? 1 : 2)
    await expect.poll(() => screen.queryByRole('textbox', {name: '관절 연결 이름'})).not.toBeNull()
    const field = screen.getByRole('textbox', {name: '관절 연결 이름'})
    fireEvent.change(field, {target: {value: name}})
    await expect.poll(() => touchJointChains(state.touch).at(-1)?.name).toBe(name)
    if (ids.length > 3) {
      await userEvent.click(
        within(screen.getByRole('group', {name})).getByRole('button', {name: '+ 관절'}),
      )
    }
    if (ids.length < 3) {
      await userEvent.click(screen.getByRole('button', {name: `${name} 관절 3 삭제`}))
    }
    const choose = async (role: number, id: string) => {
      await userEvent.click(screen.getByRole('button', {name: `${name} 관절 ${role} 파라미터`}))
      expect(screen.queryByRole('button', {name: 'Left Hand X handXY'})).toBeNull()
      const search = screen.getByRole('searchbox', {name: '파라미터 검색'})
      fireEvent.input(search, {target: {value: id}})
      await userEvent.keyboard('{Enter}')
      await expect
        .poll(
          () =>
            screen
              .queryByRole('dialog', {name: `${name} 관절 ${role} 파라미터`})
              ?.matches(':popover-open') ?? false,
        )
        .toBe(false)
    }
    for (const [index, id] of ids.entries()) {
      // eslint-disable-next-line no-await-in-loop -- Each assignment persists before choosing the next joint.
      await choose(index + 1, id)
    }
    expect(within(screen.getByRole('group', {name})).queryByRole('status')).toBeNull()
  }
  await configure('꼬리', ['tail0', 'tail1', 'tail2', 'tail3'])
  const response = screen.getByRole('spinbutton', {name: '꼬리 관절 1 반응'})
  fireEvent.input(response, {target: {value: '35'}})
  fireEvent.blur(response)
  await expect.poll(() => touchJointChains(state.touch)[0]?.joints[0]?.response).toBe(0.35)
  await userEvent.click(screen.getByRole('button', {name: '꼬리 관절 4 위로'}))
  await expect.poll(() => touchJointChains(state.touch)[0]?.joints[2]?.parameterId).toBe('tail3')
  await userEvent.click(screen.getByRole('button', {name: '꼬리 관절 3 아래로'}))
  await expect.poll(() => touchJointChains(state.touch)[0]?.joints[3]?.parameterId).toBe('tail3')
  await configure('귀', ['ear0', 'ear1'])
  expect(screen.getByRole('spinbutton', {name: '귀 관절 1 반응'})).toHaveValue('25')
  expect(state.touch.parameters).toBeUndefined()
  expect(screen.getAllByRole('textbox', {name: '관절 연결 이름'})).toHaveLength(1)
  const section = screen.getByRole('region', {name: '캐릭터 터치'})
  expect(section.scrollWidth).toBeLessThanOrEqual(section.clientWidth)
  await page
    .getByRole('region', {name: '캐릭터 터치'})
    .screenshot({path: '__screenshots__/joint-connections-320.png'})
  repository.close()
  const reopened = createLibraryRepository(database)
  repositories.push(reopened)
  writer = reopened
  expect(
    (await reopened.read()).widgets.find((item) => item.id === widget.id)?.speech?.touch,
  ).toEqual(state.touch)
  await userEvent.click(screen.getByRole('button', {name: '터치 목록으로'}))
  await userEvent.click(screen.getByRole('button', {name: '꼬리 편집'}))
  expect(screen.getByRole('spinbutton', {name: '꼬리 관절 1 반응'})).toHaveValue('35')
  await userEvent.click(screen.getByRole('button', {name: '꼬리 삭제'}))
  await expect.poll(() => touchJointChains(state.touch).length).toBe(1)
  expect(touchJointChains(state.touch)[0]?.name).toBe('귀')
})

test.each([320, 496])(
  'should search many connections and parameters while mounting one compact editor at %spx',
  async (width) => {
    const parameters = Array.from({length: 30}, (_, index) => ({
      axis: 'x' as const,
      defaultValue: 0,
      dimensions: 1,
      id: `Parameter${index}`,
      joint: true,
      maximum: 30,
      minimum: -30,
      name: `관절 ${index}`,
      parts: ['tail'],
    }))
    const [state, setState] = createStore<{touch: PoffoTouch}>({
      touch: {
        ...DEFAULT_POFFO_TOUCH,
        chains: Array.from({length: 30}, (_, index) => ({
          enabled: true,
          id: `connection-${index}`,
          joints: parameters.slice(0, index === 29 ? 12 : 3).map((parameter) => ({
            id: parameter.id,
            parameterId: parameter.id,
            response: 1,
          })),
          name: `연결 ${index + 1}`,
        })),
        enabled: true,
        parameters: Object.fromEntries(
          parameters.map((parameter) => [parameter.id, {axis: 'auto'}]),
        ),
      },
    })
    const mounted = render(() => (
      <div
        class="box-border w-[var(--editor-width)] bg-white p-3"
        style={{'--editor-width': `${width}px`}}
      >
        <SPoffoTouchSettings
          value={state.touch}
          onChange={(touch) => setState('touch', reconcile(touch))}
          source={{
            error: () => null,
            loading: () => false,
            parameters: () => parameters,
            touchParameters: () => parameters,
          }}
        />
      </div>
    ))
    const region = screen.getByRole('region', {name: '캐릭터 터치'})
    const initialHeight = region.getBoundingClientRect().height
    expect(screen.queryAllByRole('textbox', {name: '관절 연결 이름'})).toHaveLength(0)
    const search = screen.getByRole('searchbox', {name: '터치 목록 검색'})
    await userEvent.fill(search, '연결 30')
    const last = screen.getByRole('button', {name: '연결 30 편집'})
    last.focus()
    await userEvent.keyboard('{Space}')
    expect(screen.getByRole('textbox', {name: '관절 연결 이름'})).toHaveValue('연결 30')
    expect(
      screen.getByRole('group', {name: '연결 30'}).getBoundingClientRect().height,
    ).toBeLessThan(500)
    await userEvent.click(screen.getByRole('button', {name: '터치 목록으로'}))
    fireEvent.input(search, {
      target: {value: '연결 27'},
    })
    const choice = screen.getByRole('button', {name: '연결 27 편집'})
    choice.focus()
    await userEvent.keyboard('{Space}')
    expect(screen.getByRole('textbox', {name: '관절 연결 이름'})).toHaveValue('연결 27')
    const response = screen.getByRole('spinbutton', {name: '연결 27 관절 1 반응'})
    fireEvent.input(response, {target: {value: '35'}})
    fireEvent.blur(response)
    expect(touchJointChains(state.touch)[26]?.joints[0]?.response).toBe(0.35)
    expect(touchJointChains(state.touch)[0]?.joints[0]?.response).toBe(1)
    await userEvent.click(screen.getByRole('button', {name: '터치 목록으로'}))
    fireEvent.input(search, {
      target: {value: 'parameter29'},
    })
    await userEvent.click(screen.getByRole('button', {name: '관절 29 편집'}))
    await userEvent.click(screen.getByRole('switch', {name: '관절 29 방향 반전'}))
    expect(state.touch.parameters?.Parameter29?.invert).toBe(true)
    expect(state.touch.parameters?.Parameter0?.invert).toBeUndefined()
    expect(screen.getAllByRole('combobox')).toHaveLength(2)
    expect(region.getBoundingClientRect().height).toBeLessThan(initialHeight)
    await userEvent.click(screen.getByRole('combobox', {name: '터치 선택'}))
    await userEvent.click(screen.getByRole('option', {exact: true, name: '연결 27'}))
    expect(screen.getByRole('textbox', {name: '관절 연결 이름'})).toHaveValue('연결 27')
    expect(screen.getByRole('spinbutton', {name: '연결 27 관절 1 반응'})).toHaveValue('35')
    expect(mounted.container.firstElementChild!.scrollWidth).toBeLessThanOrEqual(width)
    await page
      .getByRole('region', {name: '캐릭터 터치'})
      .screenshot({path: `__screenshots__/joint-selection-${width}.png`})
  },
)
