/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterAll, afterEach, beforeAll, expect, it, vi} from 'vitest'
import {SPoffoWidgetNavigation} from '../SPoffoWidgetNavigation'
import {HSettingsScope} from '../HSettingsScope'
import {SSettingsEditor} from '../SSettingsEditor'

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

const NavigationFixture = () => {
  const [category, setCategory] = createSignal('touch')
  const [group, setGroup] = createSignal('chains')
  const [opened, setOpened] = createSignal(true)
  const choices = [
    {label: '관절 연결', value: 'chains'},
    {label: '개별 파라미터', value: 'parameters'},
  ]
  const source = {error: () => null, loading: () => false, parameters: () => []}
  const handleGroup = (value: string) => {
    setGroup(value)
    setOpened(true)
  }
  return (
    <SPoffoWidgetNavigation value={category()} source={source} onChange={setCategory}>
      <HSettingsScope
        active={category() === 'touch' && opened()}
        segment={{
          label: '터치 설정 항목',
          onBack: () => setOpened(false),
          onSelect: handleGroup,
          options: choices,
          value: group(),
        }}
      >
        <HSettingsScope active={category() === 'touch' && opened() && group() === 'chains'}>
          <SSettingsEditor
            label="관절 연결"
            options={[
              {label: '숄더백', value: 'bag'},
              {label: '꼬리', value: 'tail'},
            ]}
          >
            {(id) => <input aria-label="관절 상세" value={id} readOnly />}
          </SSettingsEditor>
        </HSettingsScope>
      </HSettingsScope>
    </SPoffoWidgetNavigation>
  )
}

it('should show the selected detail in the header and return through its parent breadcrumb', async () => {
  render(() => <NavigationFixture />)
  fireEvent.click(screen.getByRole('button', {name: '숄더백 편집'}))
  const path = within(screen.getByRole('navigation', {name: '위젯 설정 경로'}))
  expect(path.getByRole('combobox', {name: '관절 연결 선택'})).toHaveTextContent('숄더백')
  expect(screen.getAllByRole('combobox', {name: '관절 연결 선택'})).toHaveLength(1)
  await screen.findByRole('textbox', {name: '관절 상세'})
  fireEvent.click(path.getByRole('button', {name: '관절 연결 목록으로'}))
  await waitFor(() => expect(screen.queryByRole('textbox', {name: '관절 상세'})).toBeNull())
  expect(screen.getByRole('button', {name: '숄더백 편집'})).toHaveFocus()
})

it('should switch sibling groups in the breadcrumb without retaining the previous detail', () => {
  render(() => <NavigationFixture />)
  fireEvent.click(screen.getByRole('button', {name: '숄더백 편집'}))
  fireEvent.click(screen.getByRole('combobox', {name: '터치 설정 항목'}))
  fireEvent.click(screen.getByRole('option', {name: '개별 파라미터'}))
  const path = within(screen.getByRole('navigation', {name: '위젯 설정 경로'}))
  expect(path.queryByRole('combobox', {name: '관절 연결 선택'})).toBeNull()
  fireEvent.click(screen.getByRole('combobox', {name: '터치 설정 항목'}))
  fireEvent.click(screen.getByRole('option', {name: '관절 연결'}))
  expect(screen.queryByRole('textbox', {name: '관절 상세'})).toBeNull()
})
