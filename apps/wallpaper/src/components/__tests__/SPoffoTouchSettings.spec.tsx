/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {createStore, reconcile} from 'solid-js/store'
import {afterAll, afterEach, beforeAll, expect, test, vi} from 'vitest'
import {DEFAULT_POFFO_TOUCH, type PoffoTouch} from '@winter-love/wallpaper/settings/touch'
import {SPoffoTouchSettings} from '../SPoffoTouchSettings'
import type {TouchParameter} from '../../features/touch'
import {interfaceLanguage, nativeLanguage} from '../../features/localization'
import {builtinConnectionProfile} from '../../features/connection-profiles/builtin-profile'
import {touchJointChains} from '@winter-love/wallpaper/settings/touch-joint-chains'
import {SettingsNavigationContext, useSettingsNavigation} from '../../features/settings-navigation'
import {SSettingsPath} from '../SSettingsPath'

const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
beforeAll(() =>
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {configurable: true, value: vi.fn()}),
)
afterAll(() => {
  if (original === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', original)
  }
})
afterEach(cleanup)

const parameters: readonly TouchParameter[] = [
  {id: 'head', name: 'Head X'},
  {id: 'tail', joint: true, name: 'Tail rotation'},
  {id: 'TouchHairFrontLeft19', name: '왼쪽 앞머리 좌우 1'},
  {id: 'TouchRightKnee', name: '오른다리 무릎'},
].map((parameter) => ({
  ...parameter,
  axis: 'x',
  defaultValue: 0,
  dimensions: 1,
  maximum: 1,
  minimum: -1,
  parts: ['part'],
}))
const setup = (touch?: Partial<PoffoTouch>) => {
  const [state, setState] = createStore<{touch: PoffoTouch}>({
    touch: {
      ...DEFAULT_POFFO_TOUCH,
      chains: [
        {
          enabled: true,
          id: 'head',
          joints: [{id: 'joint', parameterId: 'tail', response: 1}],
          name: '왼팔',
        },
      ],
      enabled: true,
      parameters: {head: {axis: 'auto', gain: 0.7}},
      ...touch,
    },
  })
  const change = vi.fn((value: PoffoTouch) => setState('touch', reconcile(value)))
  render(() => (
    <SPoffoTouchSettings
      source={{
        error: () => null,
        loading: () => false,
        parameters: () => parameters,
        touchParameters: () => parameters,
      }}
      value={state.touch}
      onChange={change}
    />
  ))
  return {change, setState, state}
}

test('should show chains and parameters together with search even for a short list', () => {
  const {change} = setup()
  expect(screen.getByRole('button', {name: '왼팔 편집'})).toBeVisible()
  expect(screen.getByRole('button', {name: 'Head X 편집'})).toBeVisible()
  expect(screen.getByRole('searchbox', {name: '터치 목록 검색'})).toBeVisible()
  expect(screen.queryByRole('combobox', {name: '터치 설정 항목'})).toBeNull()
  expect(screen.queryByRole('button', {name: '관절 연결'})).toBeNull()
  expect(screen.queryByRole('button', {name: '개별 파라미터'})).toBeNull()
  expect(change).not.toHaveBeenCalled()
})

test('should open a touch item directly from the common header without a type page', async () => {
  render(() => {
    const navigation = useSettingsNavigation(() => ({
      label: '위젯 편집 항목',
      options: [{label: '터치', value: 'touch'}],
      value: 'touch',
    }))
    return (
      <SettingsNavigationContext.Provider value={navigation}>
        <SSettingsPath />
        <SPoffoTouchSettings
          source={{
            error: () => null,
            loading: () => false,
            parameters: () => parameters,
            touchParameters: () => parameters,
          }}
          value={{...DEFAULT_POFFO_TOUCH, enabled: true, parameters: {head: {axis: 'auto'}}}}
        />
      </SettingsNavigationContext.Provider>
    )
  })
  fireEvent.click(screen.getByRole('button', {name: 'Head X 편집'}))
  const path = within(screen.getByRole('navigation', {name: '위젯 설정 경로'}))
  expect(path.getByRole('combobox', {name: '터치 선택'})).toHaveTextContent('Head X')
  expect(path.queryByRole('combobox', {name: '터치 설정 항목'})).toBeNull()
  await screen.findByRole('combobox', {name: 'Head X 드래그 축'})
  fireEvent.click(path.getByRole('button', {name: '터치 목록으로'}))
  await screen.findByRole('searchbox', {name: '터치 목록 검색'})
})

test('should search both item types by name and their underlying parameter IDs', () => {
  const {change} = setup()
  const search = screen.getByRole('searchbox', {name: '터치 목록 검색'})
  fireEvent.input(search, {target: {value: 'tail'}})
  expect(screen.getByRole('button', {name: '왼팔 편집'})).toBeVisible()
  expect(screen.queryByRole('button', {name: 'Head X 편집'})).toBeNull()
  fireEvent.input(search, {target: {value: 'HEAD'}})
  expect(screen.getByRole('button', {name: 'Head X 편집'})).toBeVisible()
  fireEvent.input(search, {target: {value: '없는 항목'}})
  expect(screen.getByRole('status')).toHaveTextContent('검색 결과가 없어요.')
  fireEvent.input(search, {target: {value: ''}})
  expect(screen.getByRole('button', {name: '왼팔 편집'})).toBeVisible()
  expect(change).not.toHaveBeenCalled()
})

test('should switch directly between chain and parameter details even when their IDs match', () => {
  const {state} = setup()
  fireEvent.click(screen.getByRole('button', {name: '왼팔 편집'}))
  expect(screen.getByRole('textbox', {name: '관절 연결 이름'})).toHaveValue('왼팔')
  expect(screen.queryByRole('switch', {name: '캐릭터 터치 사용'})).toBeNull()
  fireEvent.change(screen.getByRole('textbox', {name: '관절 연결 이름'}), {
    target: {value: '내 팔'},
  })
  fireEvent.click(screen.getByRole('combobox', {name: '터치 선택'}))
  fireEvent.click(screen.getByRole('option', {name: 'Head X'}))
  expect(screen.getByRole('combobox', {name: 'Head X 드래그 축'})).toBeVisible()
  expect(screen.queryByRole('textbox', {name: '관절 연결 이름'})).toBeNull()
  expect(state.touch.parameters).toEqual({head: {axis: 'auto', gain: 0.7}})
  expect(state.touch.chains?.[0]).toMatchObject({id: 'head', name: '내 팔'})
})

test('should retain the mixed list search and focus after returning from detail', () => {
  setup()
  const search = screen.getByRole('searchbox', {name: '터치 목록 검색'})
  fireEvent.input(search, {target: {value: 'head'}})
  const row = screen.getByRole('button', {name: 'Head X 편집'})
  fireEvent.click(row)
  fireEvent.click(screen.getByRole('button', {name: '터치 목록으로'}))
  expect(screen.getByRole('searchbox', {name: '터치 목록 검색'})).toBe(search)
  expect(search).toHaveValue('head')
  expect(row).toHaveFocus()
})

test('should add successive parameters and a chain without replacing existing settings', async () => {
  const {state} = setup()
  const picker = within(screen.getByRole('group', {name: '추가할 파라미터'}))
  fireEvent.click(picker.getByRole('button', {name: '오른다리 무릎 TouchRightKnee'}))
  await waitFor(() =>
    expect(
      screen.getByRole('button', {name: '왼쪽 앞머리 좌우 1 TouchHairFrontLeft19'}),
    ).toBeEnabled(),
  )
  fireEvent.click(picker.getByRole('button', {name: '왼쪽 앞머리 좌우 1 TouchHairFrontLeft19'}))
  await screen.findByRole('button', {name: '왼쪽 앞머리 좌우 1 편집'})
  expect(state.touch.parameters).toEqual({
    head: {axis: 'auto', gain: 0.7},
    TouchHairFrontLeft19: {axis: 'auto'},
    TouchRightKnee: {axis: 'auto'},
  })
  fireEvent.click(screen.getByRole('button', {name: '+ 관절 연결'}))
  const name = await screen.findByRole('textbox', {name: '관절 연결 이름'})
  expect(state.touch.chains).toHaveLength(2)
  expect(name).toHaveValue('연결 1')
  expect(state.touch.parameters?.head?.gain).toBe(0.7)
})

test('should remove a parameter without removing the chain with the same ID', () => {
  const {state} = setup()
  fireEvent.click(screen.getByRole('button', {name: 'Head X 편집'}))
  fireEvent.click(screen.getByRole('button', {name: 'Head X 터치 삭제'}))
  expect(state.touch.parameters).toEqual({})
  expect(state.touch.chains).toHaveLength(1)
  expect(screen.getByRole('button', {name: '왼팔 편집'})).toBeVisible()
  expect(screen.queryByRole('combobox', {name: 'Head X 드래그 축'})).toBeNull()
})

test('should remove a chain without removing independent parameter bindings', () => {
  const {state} = setup()
  fireEvent.click(screen.getByRole('button', {name: '왼팔 편집'}))
  fireEvent.click(screen.getByRole('button', {name: '왼팔 삭제'}))
  expect(state.touch.chains).toEqual([])
  expect(state.touch.parameters?.head).toEqual({axis: 'auto', gain: 0.7})
  expect(screen.getByRole('button', {name: 'Head X 편집'})).toBeVisible()
})

test('should omit parameters managed by a ready chain and restore them when the chain is disabled', () => {
  const {state} = setup({parameters: {head: {axis: 'auto'}, tail: {axis: 'auto', invert: true}}})
  expect(screen.queryByRole('button', {name: 'Tail rotation 편집'})).toBeNull()
  expect(
    within(screen.getByRole('group', {name: '추가할 파라미터'})).queryByRole('button', {
      name: 'Tail rotation tail',
    }),
  ).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '왼팔 편집'}))
  fireEvent.click(screen.getByRole('switch', {name: '왼팔 사용'}))
  fireEvent.click(screen.getByRole('button', {name: '터치 목록으로'}))
  expect(screen.getByRole('button', {name: 'Tail rotation 편집'})).toBeVisible()
  expect(state.touch.parameters?.tail).toEqual({axis: 'auto', invert: true})
})

test('should keep search available when no items have been added', () => {
  setup({chains: [], parameters: {}})
  expect(screen.getByRole('searchbox', {name: '터치 목록 검색'})).toBeVisible()
  expect(screen.getByRole('button', {name: '+ 관절 연결'})).toBeEnabled()
})

test('should update details when library reconciliation retains the parameter record', () => {
  const {setState, state} = setup()
  fireEvent.click(screen.getByRole('button', {name: 'Head X 편집'}))
  setState(
    'touch',
    reconcile({...state.touch, parameters: {head: {axis: 'auto'}, TouchRightKnee: {axis: 'auto'}}}),
  )
  fireEvent.click(screen.getByRole('combobox', {name: '터치 선택'}))
  fireEvent.click(screen.getByRole('option', {name: '오른다리 무릎'}))
  expect(screen.getByRole('combobox', {name: '오른다리 무릎 드래그 축'})).toBeVisible()
  setState('touch', reconcile({...state.touch, parameters: {head: {axis: 'auto'}}}))
  expect(screen.queryByRole('combobox', {name: '오른다리 무릎 드래그 축'})).toBeNull()
  expect(screen.getByRole('button', {name: 'Head X 편집'})).toBeVisible()
})

test('should localize default items while preserving saved names, parameter IDs and user renames', async () => {
  const save = vi.spyOn(nativeLanguage, 'save').mockResolvedValue(undefined)
  const previous = interfaceLanguage.language()
  try {
    await interfaceLanguage.change('en')
    const chains = touchJointChains(builtinConnectionProfile('builtin:ash')!.connections.touch)
    const {state, change} = setup({chains, parameters: {TouchHairFrontLeft19: {axis: 'auto'}}})
    const search = screen.getByRole('searchbox', {name: 'Search Touch list'})
    fireEvent.input(search, {target: {value: '숄더백'}})
    fireEvent.click(screen.getByRole('button', {name: 'Edit Shoulder bag'}))
    expect(screen.getByRole('textbox', {name: 'Joint chain name'})).toHaveValue('Shoulder bag')
    expect(change).not.toHaveBeenCalled()
    await interfaceLanguage.change('ko')
    expect(screen.getByRole('textbox', {name: '관절 연결 이름'})).toHaveValue('숄더백')
    fireEvent.change(screen.getByRole('textbox', {name: '관절 연결 이름'}), {
      target: {value: '내 가방'},
    })
    await interfaceLanguage.change('en')
    expect(screen.getByRole('textbox', {name: 'Joint chain name'})).toHaveValue('내 가방')
    fireEvent.click(screen.getByRole('combobox', {name: 'Select Touch'}))
    fireEvent.click(screen.getByRole('option', {name: 'Left bangs horizontal 1'}))
    expect(screen.getByRole('combobox', {name: 'Left bangs horizontal 1 drag axis'})).toBeVisible()
    expect(state.touch.parameters).toEqual({TouchHairFrontLeft19: {axis: 'auto'}})
  } finally {
    cleanup()
    await interfaceLanguage.change(previous)
    save.mockRestore()
  }
})
