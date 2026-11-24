/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createStore, reconcile} from 'solid-js/store'
import {afterAll, afterEach, beforeAll, expect, test, vi} from 'vitest'
import {DEFAULT_POFFO_TOUCH, type PoffoTouch} from '@winter-love/wallpaper/settings/touch'
import {SPoffoJointChains} from '../SPoffoJointChains'
import {touchJointChains} from '@winter-love/wallpaper/settings/touch-joint-chains'
import {builtinConnectionProfile} from '../../features/connection-profiles/builtin-profile'
import {interfaceLanguage, nativeLanguage} from '../../features/localization'

afterEach(cleanup)
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

const setup = (chains?: PoffoTouch['chains']) => {
  const [state, setState] = createStore<{touch: PoffoTouch}>({
    touch: {
      ...DEFAULT_POFFO_TOUCH,
      chains:
        chains ??
        ['왼팔', '오른팔', '꼬리', '왼다리', '오른다리', '머리'].map((name, index) => ({
          enabled: true,
          id: `chain-${index}`,
          joints: [{id: `joint-${index}`, parameterId: `parameter-${index}`, response: 0.5}],
          name,
        })),
    },
  })
  const change = vi.fn((patch: Partial<PoffoTouch>) =>
    setState('touch', reconcile({...state.touch, ...patch})),
  )
  render(() => (
    <SPoffoJointChains
      value={state.touch}
      source={{error: () => null, loading: () => false, parameters: () => []}}
      onChange={change}
    />
  ))
  return {change, state}
}

test('should edit one selected chain and retain the other connections', () => {
  const {state} = setup()
  expect(screen.queryByRole('textbox', {name: '관절 연결 이름'})).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '꼬리 편집'}))
  expect(screen.queryByRole('button', {name: '꼬리 편집'})).toBeNull()
  fireEvent.change(screen.getByRole('textbox', {name: '관절 연결 이름'}), {
    target: {value: '긴 꼬리'},
  })
  expect(state.touch.chains?.[2]).toMatchObject({id: 'chain-2', name: '긴 꼬리'})
  fireEvent.click(screen.getByRole('combobox', {name: '관절 연결 선택'}))
  fireEvent.click(screen.getByRole('option', {name: '왼팔'}))
  expect(screen.getByRole('textbox', {name: '관절 연결 이름'})).toHaveValue('왼팔')
  expect(state.touch.chains).toHaveLength(6)
})

test('should find a connection by name without changing its saved settings', () => {
  const {change} = setup()
  fireEvent.input(screen.getByRole('searchbox', {name: '관절 연결 목록 검색'}), {
    target: {value: '다리'},
  })
  expect(screen.getByRole('button', {name: '왼다리 편집'})).toBeInTheDocument()
  expect(screen.getByRole('button', {name: '오른다리 편집'})).toBeInTheDocument()
  expect(screen.queryByRole('button', {name: '꼬리 편집'})).toBeNull()
  expect(change).not.toHaveBeenCalled()
})

test('should return to the list after removing the edited connection', () => {
  const {state} = setup()
  fireEvent.click(screen.getByRole('button', {name: '꼬리 편집'}))
  fireEvent.click(screen.getByRole('button', {name: '꼬리 삭제'}))
  expect(state.touch.chains).toHaveLength(5)
  expect(screen.queryByRole('textbox', {name: '관절 연결 이름'})).toBeNull()
  expect(screen.getByRole('button', {name: '왼팔 편집'})).toBeVisible()
})

test('should localize the default list and detail while retaining saved names and user renames', async () => {
  const save = vi.spyOn(nativeLanguage, 'save').mockResolvedValue(undefined)
  const previous = interfaceLanguage.language()
  try {
    await interfaceLanguage.change('en')
    const {state, change} = setup(
      touchJointChains(builtinConnectionProfile('builtin:ash')!.connections.touch),
    )
    fireEvent.input(screen.getByRole('searchbox', {name: 'Search Joint chains list'}), {
      target: {value: '숄더백'},
    })
    fireEvent.click(screen.getByRole('button', {name: 'Edit Shoulder bag'}))
    expect(screen.getByRole('textbox', {name: 'Joint chain name'})).toHaveValue('Shoulder bag')
    expect(screen.getByRole('combobox', {name: 'Select Joint chains'})).toHaveTextContent(
      'Shoulder bag',
    )
    expect(change).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('switch', {name: 'Enable Shoulder bag'}))
    expect(
      state.touch.chains?.find((chain) => 'id' in chain && chain.id === 'touch:bag'),
    ).toMatchObject({enabled: false, name: '숄더백'})
    await interfaceLanguage.change('ko')
    expect(screen.getByRole('textbox', {name: '관절 연결 이름'})).toHaveValue('숄더백')
    expect(screen.getByRole('combobox', {name: '관절 연결 선택'})).toHaveTextContent('숄더백')
    fireEvent.change(screen.getByRole('textbox', {name: '관절 연결 이름'}), {
      target: {value: '나의 가방'},
    })
    await interfaceLanguage.change('en')
    expect(screen.getByRole('textbox', {name: 'Joint chain name'})).toHaveValue('나의 가방')
    expect(screen.getByRole('combobox', {name: 'Select Joint chains'})).toHaveTextContent(
      '나의 가방',
    )
  } finally {
    cleanup()
    await interfaceLanguage.change(previous)
    save.mockRestore()
  }
})
