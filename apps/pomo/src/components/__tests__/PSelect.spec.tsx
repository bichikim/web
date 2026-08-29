/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {type JSX, Match, Switch} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {Select} from '@kobalte/core/select'
import {PSelectItem} from '../p-select/Item'
import {PSelectParts} from '../p-select/Parts'
import {PSelect} from '../PSelect'

vi.mock('@kobalte/core/select', () => ({Select: vi.fn()}))
vi.mock('../p-select/Item', () => ({PSelectItem: vi.fn()}))
vi.mock('../p-select/Parts', () => ({PSelectParts: vi.fn()}))
vi.mock('solid-js', async () => {
  const actual: typeof import('solid-js') = await vi.importActual('solid-js')

  return {...actual, Match: vi.fn(), Switch: vi.fn()}
})

const options = [
  {description: '첫 번째 항목', icon: 'i-tabler-sun', label: '낮', value: 'day'},
  {icon: 'i-tabler-moon', label: '밤', value: 'night'},
] as const

const getSelectProps = () => vi.mocked(Select).mock.calls.at(-1)?.[0]

const renderItem = (props: ReturnType<typeof getSelectProps>) => {
  const itemComponent = props?.itemComponent as ((item: unknown) => unknown) | undefined

  itemComponent?.({item: {rawValue: options[0]}})
}

const emitChange = (props: ReturnType<typeof getSelectProps>, value: unknown) => {
  const onChange = props?.onChange as ((nextValue: unknown) => void) | undefined

  onChange?.(value)
}

beforeEach(() => {
  vi.mocked(Match).mockImplementation((props) => {
    const current = typeof props.when === 'function' ? props.when() : props.when

    const children = props.children as
      | ((value: NonNullable<typeof current>) => JSX.Element)
      | undefined

    return current && children ? <>{children(current)}</> : <></>
  })
  vi.mocked(Switch).mockImplementation((props) => <>{props.children}</>)
  vi.mocked(Select).mockImplementation((props) => {
    Object.values(props)
    return <div>{props.children}</div>
  })
  vi.mocked(PSelectItem).mockImplementation((props) => {
    Object.values(props)
    return <></>
  })
  vi.mocked(PSelectParts).mockImplementation((props) => {
    Object.values(props)
    return <></>
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('PSelect', () => {
  it('should configure an icon single select and emit a selected option', () => {
    const onChange = vi.fn()

    render(() => (
      <PSelect
        appearance="icon"
        class="scene-select"
        getIconClass={(icon) => `custom-${icon}`}
        label="시간"
        onChange={onChange}
        options={options}
        value="day"
      />
    ))

    const props = getSelectProps()
    expect(props).toMatchObject({
      class: 'pomo-icon-select block scene-select',
      placement: 'bottom-end',
      value: options[0],
    })
    emitChange(props, options[1])
    renderItem(props)
    expect(onChange).toHaveBeenCalledWith('night')
    expect(vi.mocked(PSelectItem)).toHaveBeenCalledOnce()
    expect(vi.mocked(PSelectParts)).toHaveBeenCalledWith(
      expect.objectContaining({accessibleLabel: '시간 낮', selectedIcon: 'i-tabler-sun'}),
    )
  })

  it('should configure the default single select with fallback and explicit accessible labels', () => {
    render(() => (
      <PSelect
        accessibleLabel="시간대 고르기"
        disabled
        hideLabel
        label="시간"
        onChange={() => undefined}
        options={options}
        placeholder="시간 선택"
        value={'missing' as 'day' | 'night'}
      />
    ))

    const props = getSelectProps()
    expect(props).toMatchObject({
      disabled: true,
      placeholder: '시간 선택',
      placement: 'bottom-start',
      value: options[0],
    })
    emitChange(props, null)
    renderItem(props)
    expect(vi.mocked(PSelectParts)).toHaveBeenCalledWith(
      expect.objectContaining({accessibleLabel: '시간대 고르기', selectedIcon: 'i-tabler-sun'}),
    )
  })

  it('should configure the default single select without an accessible label', () => {
    render(() => <PSelect label="시간" onChange={() => undefined} options={options} value="day" />)

    expect(vi.mocked(PSelectParts)).toHaveBeenCalledWith(
      expect.objectContaining({accessibleLabel: undefined}),
    )
  })

  it('should configure an empty single select without an icon label suffix', () => {
    render(() => (
      <PSelect
        appearance="icon"
        label="시간"
        onChange={() => undefined}
        options={[]}
        value={'missing' as 'day'}
      />
    ))

    expect(getSelectProps()).toMatchObject({value: undefined})
    expect(vi.mocked(PSelectParts)).toHaveBeenCalledWith(
      expect.objectContaining({accessibleLabel: '시간 '}),
    )
  })

  it('should configure detailed multiple choices, clear them, and omit unknown values', () => {
    const onChange = vi.fn()
    const selectionLabel = vi.fn(() => '선택된 시간')

    render(() => (
      <PSelect
        appearance="detailed"
        clearLabel="모두 지우기"
        label="시간"
        multiple
        onChange={onChange}
        options={options}
        selectionLabel={selectionLabel}
        value={['day', 'unknown'] as ReadonlyArray<'day'>}
      />
    ))

    const props = getSelectProps()
    expect(props).toMatchObject({
      closeOnSelection: false,
      multiple: true,
      placement: 'bottom-start',
      value: [options[0]],
    })
    emitChange(props, [options[1]])
    renderItem(props)
    expect(onChange).toHaveBeenCalledWith(['night'])
    expect(vi.mocked(PSelectParts)).toHaveBeenCalledWith(
      expect.objectContaining({clearDisabled: false, clearLabel: '모두 지우기'}),
    )

    const partsProps = vi.mocked(PSelectParts).mock.calls.at(-1)?.[0]
    partsProps?.onClear?.()
    expect(onChange).toHaveBeenLastCalledWith([])
  })

  it('should configure an empty multiple selection with a disabled clear action', () => {
    render(() => (
      <PSelect<'day' | 'night'>
        label="시간"
        multiple
        onChange={() => undefined}
        options={options}
        value={[]}
      />
    ))

    expect(getSelectProps()).toMatchObject({multiple: true, value: []})
    expect(vi.mocked(PSelectParts)).toHaveBeenCalledWith(
      expect.objectContaining({clearDisabled: true, selectionLabel: undefined}),
    )
  })
})
