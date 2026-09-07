/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {expect, it, vi} from 'vitest'

vi.mock('@kobalte/core/select', () => {
  const Container = (props: {readonly children?: JSX.Element; readonly class?: string}) => (
    <div class={props.class}>{props.children}</div>
  )
  return {
    Select: Object.assign(Container, {
      Content: Container,
      HiddenSelect: () => <select aria-label="hidden select" />,
      Icon: Container,
      Label: Container,
      Listbox: (props: {readonly class?: string}) => <ul class={props.class} />,
      Portal: Container,
      Trigger: (props: {
        readonly 'aria-label'?: string
        readonly children?: JSX.Element
        readonly class?: string
      }) => (
        <button aria-label={props['aria-label']} class={props.class} type="button">
          {props.children}
        </button>
      ),
      Value: (props: {
        readonly children: (state: {
          selectedOption: () => {label: string}
          selectedOptions: () => ReadonlyArray<{label: string}>
        }) => JSX.Element
        readonly class?: string
      }) => (
        <span class={props.class}>
          {props.children({
            selectedOption: () => ({label: '하나'}),
            selectedOptions: () => [{label: '하나'}, {label: '둘'}],
          })}
        </span>
      ),
    }),
  }
})

import {PSelectParts} from '../Parts'

it('should render labels, single and multiple values, icons, and clearing controls', () => {
  const onClear = vi.fn()
  const getIconClass = vi.fn(() => 'resolved-icon')
  const result = render(() => (
    <>
      <PSelectParts appearance="default" label="단일" />
      <PSelectParts appearance="detailed" hideLabel label="숨김" />
      <PSelectParts
        appearance="default"
        clearLabel="모두 지우기"
        multiple
        onClear={onClear}
        selectionLabel={(options) => `${options.length}개 선택됨`}
        label="다중"
      />
      <PSelectParts
        accessibleLabel="아이콘 선택"
        appearance="icon"
        getIconClass={getIconClass}
        hideLabel
        label="아이콘"
        selectedIcon="i-tabler-sun"
      />
    </>
  ))

  expect(screen.getByText('단일')).toBeInTheDocument()
  expect(screen.getByText('숨김')).toHaveClass('sr-only')
  expect(screen.getAllByText('하나')).toHaveLength(2)
  expect(screen.getByText('2개 선택됨')).toBeInTheDocument()
  expect(result.container.querySelector('.resolved-icon')).toHaveClass('size-6')
  fireEvent.click(screen.getByRole('button', {name: '모두 지우기'}))
  expect(onClear).toHaveBeenCalledOnce()
})

it('should use fallback multiple labels and leave optional clear handlers safe', () => {
  render(() => <PSelectParts appearance="default" clearLabel="지우기" multiple label="기본 다중" />)

  expect(screen.getByText('2개 선택')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: '지우기'}))
})

it('should hide duplicate labels, preserve icon fallbacks, and disable clearing when requested', () => {
  const result = render(() => (
    <>
      <PSelectParts
        accessibleLabel="숨은 선택"
        appearance="icon"
        hideLabel
        label="숨은 라벨"
        selectedIcon="i-tabler-moon"
      />
      <PSelectParts appearance="default" hideLabel label="스크린 리더 라벨" />
      <PSelectParts
        appearance="default"
        clearDisabled
        clearLabel="비활성 지우기"
        multiple
        label="비활성 다중"
      />
    </>
  ))

  expect(screen.queryByText('숨은 라벨')).toBeNull()
  expect(screen.getByText('스크린 리더 라벨')).toHaveClass('sr-only')
  expect(result.container.querySelector('.i-tabler-moon')).not.toBeNull()
  expect(screen.getByRole('button', {name: '비활성 지우기'})).toBeDisabled()
})
