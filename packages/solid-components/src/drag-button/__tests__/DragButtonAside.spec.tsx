/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal, type JSX, splitProps} from 'solid-js'
import {expect, expectTypeOf, it, vi} from 'vitest'
import {DragButtonAside, type DragButtonAsideProps} from '../DragButtonAside'
import {DragButtonContext} from '../context'

interface AsideTargetProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  component: 'target'
  label: string
  position: 'target'
}

const AsideTarget = (props: AsideTargetProps) => {
  const [local, rest] = splitProps(props, ['label', 'position', 'children', 'component'])
  return (
    <button {...rest} data-position={local.position} data-component={local.component}>
      {local.label}
      {local.children}
    </button>
  )
}

it('should forward and update target attributes and handlers while retaining the drag style', () => {
  const firstClick = vi.fn()
  const nextClick = vi.fn()
  const [attributes, setAttributes] = createSignal<JSX.ButtonHTMLAttributes<HTMLButtonElement>>({
    class: 'first',
    onClick: firstClick,
    style: {color: 'red'},
    title: 'first',
  })
  const view = render(() => (
    <DragButtonContext.Provider
      value={[() => ({dragX: 20, dragY: 0}), {handleMouseDown: vi.fn(), handleTouchStart: vi.fn()}]}
    >
      <DragButtonAside component="button" position="left" componentProps={attributes()}>
        Action
      </DragButtonAside>
    </DragButtonContext.Provider>
  ))
  const button = view.getByRole('button', {name: 'Action'})
  expect(button).toHaveClass('first')
  expect(button).toHaveStyle({color: 'rgb(255, 0, 0)'})
  expect(button.style.getPropertyValue('--solid-drag-x')).toBe('20px')
  fireEvent.click(button)
  setAttributes({class: 'next', onClick: nextClick, title: 'next'})
  expect(button).toHaveClass('next')
  expect(button).toHaveAttribute('title', 'next')
  fireEvent.click(button)
  expect(firstClick).toHaveBeenCalledOnce()
  expect(nextClick).toHaveBeenCalledOnce()
})

it('should keep custom target props separate and let JSX children replace target children', () => {
  const view = render(() => (
    <DragButtonContext.Provider
      value={[() => ({dragX: 20, dragY: 0}), {handleMouseDown: vi.fn(), handleTouchStart: vi.fn()}]}
    >
      <DragButtonAside
        component={AsideTarget}
        position="left"
        componentProps={{
          children: ' inner',
          component: 'target',
          label: 'Custom',
          position: 'target',
        }}
      >
        {' '}
        outer
      </DragButtonAside>
    </DragButtonContext.Provider>
  ))
  expect(view.getByRole('button', {name: 'Custom outer'})).toHaveAttribute(
    'data-position',
    'target',
  )
  expect(view.getByRole('button', {name: 'Custom outer'})).toHaveAttribute(
    'data-component',
    'target',
  )
  expect(view.queryByText('inner')).toBeNull()
})

it('should render children supplied through componentProps when JSX children are omitted', () => {
  const view = render(() => (
    <DragButtonContext.Provider
      value={[() => ({dragX: 20, dragY: 0}), {handleMouseDown: vi.fn(), handleTouchStart: vi.fn()}]}
    >
      <DragButtonAside
        component="span"
        position="left"
        componentProps={{children: 'Target child'}}
      />
    </DragButtonContext.Provider>
  ))
  expect(view.getByText('Target child')).toBeInTheDocument()
})

it('should keep explicitly hidden JSX children hidden without replacing the focused target', () => {
  const [child, setChild] = createSignal<JSX.Element>('Visible')
  const view = render(() => (
    <DragButtonContext.Provider
      value={[() => ({dragX: 20, dragY: 0}), {handleMouseDown: vi.fn(), handleTouchStart: vi.fn()}]}
    >
      <DragButtonAside component="button" position="left" componentProps={{children: 'Fallback'}}>
        {child()}
      </DragButtonAside>
    </DragButtonContext.Provider>
  ))
  const button = view.getByRole('button', {name: 'Visible'})
  button.focus()
  setChild(null)
  expect(button.textContent).toBe('')
  expect(view.queryByText('Fallback')).toBeNull()
  expect(document.activeElement).toBe(button)
  setChild(undefined)
  expect(button.textContent).toBe('')
  setChild('Updated')
  expect(view.getByRole('button', {name: 'Updated'})).toBe(button)
})

it('should require custom target props and keep their value types', () => {
  type NumberChildTarget = (props: {children: number}) => JSX.Element
  type InvalidChildren = {
    children: string
    component: NumberChildTarget
    componentProps: {children: number}
    position: 'left'
  }
  expectTypeOf<InvalidChildren>().not.toMatchTypeOf<DragButtonAsideProps<NumberChildTarget>>()
  type WithoutTargetProps = {component: typeof AsideTarget; position: 'left'}
  type InvalidTargetProps = WithoutTargetProps & {
    componentProps: {component: 'target'; label: number; position: 'target'}
  }
  expectTypeOf<WithoutTargetProps>().not.toMatchTypeOf<DragButtonAsideProps<typeof AsideTarget>>()
  expectTypeOf<InvalidTargetProps>().not.toMatchTypeOf<DragButtonAsideProps<typeof AsideTarget>>()
  expectTypeOf<{component: 'span'; position: 'left'}>().toMatchTypeOf<
    DragButtonAsideProps<'span'>
  >()
})
