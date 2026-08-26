/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import type {SelectRootItemComponentProps} from '@kobalte/core/select'
import type {JSX} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'
import {PSelectItem} from '../Item'
import type {PSelectOption} from '../shared'

vi.mock('@kobalte/core/select', () => {
  const Container = (props: {
    readonly children?: JSX.Element
    readonly class?: string
    readonly forceMount?: boolean
  }) => (
    <div class={props.class} data-force-mount={props.forceMount}>
      {props.children}
    </div>
  )

  return {
    Select: {
      Item: (props: {
        readonly children?: JSX.Element
        readonly class?: string
        readonly forceMount?: boolean
      }) => (
        <div class={props.class} data-force-mount={props.forceMount}>
          {props.children}
        </div>
      ),
      ItemDescription: Container,
      ItemIndicator: Container,
      ItemLabel: Container,
    },
  }
})

type TestOption = PSelectOption<'day' | 'night' | 'auto'>

const createItem = (rawValue: TestOption) =>
  ({rawValue}) as SelectRootItemComponentProps<TestOption>['item']

describe('PSelectItem', () => {
  it('should render default item text, description, and fallback indicator icon', () => {
    const {container} = render(() => (
      <PSelectItem
        appearance="default"
        item={createItem({
          description: '밝은 화면으로 전환합니다',
          label: '낮',
          value: 'day',
        })}
      />
    ))

    expect(screen.getByText('낮')).toBeInTheDocument()
    expect(screen.getByText('밝은 화면으로 전환합니다')).toBeInTheDocument()
    expect(container.querySelector('.i-tabler-check.size-4')).not.toBeNull()
    expect(container.firstElementChild).toHaveClass('flex')
  })

  it('should render detailed items and force their indicator mounting', () => {
    const {container} = render(() => (
      <PSelectItem
        appearance="detailed"
        forceIndicator
        item={createItem({label: '자동', value: 'auto'})}
      />
    ))

    expect(screen.getByText('자동')).toBeInTheDocument()
    expect(container.querySelector('.i-tabler-check.size-3\\.5')).not.toBeNull()
    expect(container.firstElementChild).toHaveClass('grid')
    expect(container.querySelector('[data-force-mount="true"]')).not.toBeNull()
  })

  it('should render icon items with resolved item and indicator icons', () => {
    const getIconClass = vi.fn((icon: string) => `resolved-${icon}`)
    const {container} = render(() => (
      <PSelectItem
        appearance="icon"
        getIconClass={getIconClass}
        item={createItem({icon: 'i-tabler-moon', label: '밤', value: 'night'})}
      />
    ))

    expect(screen.getByText('밤')).toBeInTheDocument()
    expect(container.querySelector('.resolved-i-tabler-moon')).not.toBeNull()
    expect(container.querySelector('.resolved-i-tabler-check.size-4')).not.toBeNull()
    expect(getIconClass).toHaveBeenCalledWith('i-tabler-check')
    expect(getIconClass).toHaveBeenCalledWith('i-tabler-moon')
  })
})
