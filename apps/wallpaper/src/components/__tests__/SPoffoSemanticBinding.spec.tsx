/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterAll, afterEach, beforeAll, expect, test, vi} from 'vitest'
import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import {SPoffoSemanticBinding} from '../SPoffoSemanticBinding'
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
test('should save a named group and return to the default group when it is cleared', () => {
  const [value, setValue] = createSignal<SemanticBinding>({
    enabled: true,
    id: 'test',
    mode: 'toggle',
    parameterId: null,
    text: '기록',
    threshold: 0.8,
  })
  render(() => <SPoffoSemanticBinding value={value()} onChange={setValue} />)
  const input = screen.getByRole('textbox', {name: '연결 그룹'})
  fireEvent.change(input, {target: {value: '  표정  '}})
  expect(value().exclusiveGroup).toBe('표정')
  fireEvent.change(input, {target: {value: ''}})
  expect(value().exclusiveGroup).toBeUndefined()
})

test('should save each action release point while preserving its other settings', () => {
  const [value, setValue] = createSignal<SemanticBinding>({
    action: {id: 'notes', kind: 'expression'},
    enabled: true,
    id: 'test',
    mode: 'toggle',
    parameterId: null,
    text: '작성했어요',
    threshold: 0.84,
  })
  render(() => <SPoffoSemanticBinding value={value()} onChange={setValue} />)
  const select = screen.getByRole('combobox', {name: '연결 해제 시점'})
  expect(select).toHaveTextContent('음성이 끝나면 해제')
  fireEvent.keyDown(select, {key: 'End'})
  fireEvent.keyDown(select, {key: 'Enter'})
  expect(value().release).toBe('next-speech')
  expect(value()).toMatchObject({
    action: {id: 'notes', kind: 'expression'},
    text: '작성했어요',
    threshold: 0.84,
  })
  fireEvent.keyDown(select, {key: 'Home'})
  fireEvent.keyDown(select, {key: 'Enter'})
  expect(value().release).toBe('speech-end')
})

test('should show text matching only for emotion and context connections, retaining hidden values', () => {
  const [value, setValue] = createSignal<SemanticBinding>({
    category: 'behavior',
    enabled: true,
    id: 'pose',
    mode: 'toggle',
    parameterId: null,
    text: '기존 예문',
    threshold: 0.86,
  })
  render(() => <SPoffoSemanticBinding value={value()} onChange={setValue} score={0.9} />)
  expect(screen.queryByRole('textbox', {name: '연결 감정·행동·내용'})).toBeNull()
  expect(screen.queryByRole('spinbutton', {name: '연결 매칭 기준'})).toBeNull()
  expect(screen.queryByLabelText('연결 매칭 점수')).toBeNull()
  expect(screen.getByRole('combobox', {name: '연결 해제 시점'})).toBeInTheDocument()
  const category = screen.getByRole('combobox', {name: '연결 종류'})
  fireEvent.keyDown(category, {key: 'Home'})
  fireEvent.keyDown(category, {key: 'Enter'})
  expect(category).toHaveTextContent('감정·내용')
  expect(screen.getByRole('textbox', {name: '연결 감정·행동·내용'})).toHaveValue('기존 예문')
  expect(screen.getByRole('spinbutton', {name: '연결 매칭 기준'})).toHaveValue('0.86')
})

test('should add and remove actions while sharing one group and release point', async () => {
  const [value, setValue] = createSignal<SemanticBinding>({
    action: {id: 'notes', kind: 'expression'},
    enabled: true,
    exclusiveGroup: '함께',
    id: 'bundle',
    mode: 'toggle',
    parameterId: null,
    release: 'next-speech',
    text: '기쁘고 신나요',
    threshold: 0.8,
  })
  render(() => (
    <SPoffoSemanticBinding
      value={value()}
      onChange={setValue}
      actions={[
        {action: {id: 'notes', kind: 'expression'}, label: '노트'},
        {action: {id: 'smile', kind: 'expression'}, label: '반짝눈'},
      ]}
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: '연결 행동 추가'}))
  fireEvent.click(screen.getByRole('combobox', {name: '연결 행동 2'}))
  fireEvent.click(screen.getByRole('option', {name: '반짝눈'}))
  await vi.waitFor(() =>
    expect(value().actions?.map((action) => action.id)).toEqual(['notes', 'smile']),
  )
  expect(value()).toMatchObject({
    exclusiveGroup: '함께',
    release: 'next-speech',
    text: '기쁘고 신나요',
  })
  expect(screen.getAllByRole('textbox', {name: '연결 그룹'})).toHaveLength(1)
  expect(screen.getAllByRole('combobox', {name: '연결 해제 시점'})).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', {name: '연결 행동 1 삭제'}))
  await vi.waitFor(() => expect(value().actions?.map((action) => action.id)).toEqual(['smile']))
})

test('should register a menu action without speech matching or release controls', () => {
  const [value, setValue] = createSignal<SemanticBinding>({
    action: {id: 'tiny', kind: 'expression'},
    enabled: true,
    id: 'tiny',
    mode: 'toggle',
    parameterId: null,
    text: '이전 문구',
    threshold: 0.8,
  })
  render(() => (
    <SPoffoSemanticBinding
      value={value()}
      onChange={setValue}
      actions={[{action: {id: 'tiny', kind: 'expression'}, label: '작아지기'}]}
      score={1}
    />
  ))
  fireEvent.click(screen.getByRole('combobox', {name: '연결 종류'}))
  fireEvent.click(screen.getByRole('option', {name: '우클릭 메뉴'}))
  expect(value()).toMatchObject({category: 'menu', menuLabel: '작아지기'})
  expect(screen.queryByRole('textbox', {name: '연결 감정·행동·내용'})).toBeNull()
  expect(screen.queryByRole('combobox', {name: '연결 해제 시점'})).toBeNull()
  expect(screen.queryByLabelText('연결 매칭 점수')).toBeNull()
  fireEvent.change(screen.getByRole('textbox', {name: '연결 메뉴 이름'}), {
    target: {value: '귀엽게 작아지기'},
  })
  expect(value().menuLabel).toBe('귀엽게 작아지기')
})
