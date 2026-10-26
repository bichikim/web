/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal, type JSX, splitProps} from 'solid-js'
import {expect, expectTypeOf, it, vi} from 'vitest'
import {SScrollBar, type SScrollBarProps} from '../SScrollBar'
import {ScrollContext} from '../scroll-context'
import {useScrollBar} from '../scroll-bar-context'
import type {ScrollBarType} from '../types'

const createScrollContext = () => ({
  moveScroll: vi.fn(),
  onScroll: vi.fn(),
  setScroll: vi.fn(),
  setScrollBodyElement: vi.fn(),
  value: () => ({
    containerHeight: 100,
    containerLeft: 0,
    containerTop: 0,
    containerWidth: 80,
    id: 'scroll',
    percentX: 0.25,
    percentY: 0.5,
    scrollHeight: 400,
    scrollLeft: 60,
    scrollTop: 150,
    scrollWidth: 320,
    showXBar: true,
    showYBar: true,
  }),
})

interface BarTargetProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  barType: 'target'
  component: 'target'
  label: string
}

const BarTarget = (props: BarTargetProps) => {
  const [local, rest] = splitProps(props, ['barType', 'label', 'component'])
  const bar = useScrollBar()
  return (
    <button
      {...rest}
      data-axis={bar().type}
      data-target={local.barType}
      data-component={local.component}
    >
      {local.label}
    </button>
  )
}

it('should default to a vertical bar and forward target props while scrolling and notifying clicks', () => {
  const context = createScrollContext()
  const clicked = vi.fn()
  const view = render(() => (
    <ScrollContext.Provider value={context}>
      <SScrollBar
        component={BarTarget}
        componentProps={{
          barType: 'target',
          component: 'target',
          label: 'Scroll',
          onClick: [clicked, 'payload'],
          style: {opacity: 0.5},
        }}
      />
    </ScrollContext.Provider>
  ))
  const button = view.getByRole('button', {name: 'Scroll'})
  expect(button).toHaveAttribute('data-axis', 'vertical')
  expect(button).toHaveAttribute('data-target', 'target')
  expect(button).toHaveAttribute('data-component', 'target')
  expect(button).toHaveAttribute('data-show', 'true')
  expect(button).toHaveStyle({opacity: '0.5'})
  expect(button.style.getPropertyValue('--var-percent')).toBe('0.5')
  const click = new MouseEvent('click', {bubbles: true})
  Object.defineProperty(click, 'offsetY', {value: 25})
  fireEvent(button, click)
  expect(context.setScroll).toHaveBeenCalledWith('vertical', 75)
  expect(clicked).toHaveBeenCalledExactlyOnceWith('payload', click)
})

it('should track changed orientation and replacement target props', () => {
  const context = createScrollContext()
  const [barType, setBarType] = createSignal<ScrollBarType>('vertical')
  const [attributes, setAttributes] = createSignal<JSX.ButtonHTMLAttributes<HTMLButtonElement>>({
    title: 'first',
  })
  const view = render(() => (
    <ScrollContext.Provider value={context}>
      <SScrollBar component="button" barType={barType()} componentProps={attributes()}>
        Scroll
      </SScrollBar>
    </ScrollContext.Provider>
  ))
  const button = view.getByRole('button', {name: 'Scroll'})
  expect(button).toHaveAttribute('title', 'first')
  setBarType('horizontal')
  setAttributes({title: 'next'})
  expect(button).toHaveAttribute('title', 'next')
  expect(button.style.getPropertyValue('--var-percent')).toBe('0.25')
  const click = new MouseEvent('click', {bubbles: true})
  Object.defineProperty(click, 'offsetX', {value: 20})
  fireEvent(button, click)
  expect(context.setScroll).toHaveBeenCalledWith('horizontal', 60)
})

it('should keep the div fallback without requiring a target props object', () => {
  const view = render(() => (
    <ScrollContext.Provider value={createScrollContext()}>
      <SScrollBar component={undefined}>Fallback</SScrollBar>
    </ScrollContext.Provider>
  ))
  expect(view.getByText('Fallback').tagName).toBe('DIV')
})

it('should keep explicitly hidden JSX children hidden without replacing the focused target', () => {
  const [child, setChild] = createSignal<JSX.Element>('Visible')
  const view = render(() => (
    <ScrollContext.Provider value={createScrollContext()}>
      <SScrollBar component="button" componentProps={{children: 'Fallback'}}>
        {child()}
      </SScrollBar>
    </ScrollContext.Provider>
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

it('should require custom target props without making native optional props required', () => {
  type NumberChildTarget = (props: {children: number}) => JSX.Element
  type InvalidChildren = {
    children: string
    component: NumberChildTarget
    componentProps: {children: number}
  }
  expectTypeOf<InvalidChildren>().not.toMatchTypeOf<SScrollBarProps<NumberChildTarget>>()
  type WithoutTargetProps = {component: typeof BarTarget}
  type InvalidTargetProps = WithoutTargetProps & {
    componentProps: {barType: 'target'; component: 'target'; label: number}
  }
  expectTypeOf<WithoutTargetProps>().not.toMatchTypeOf<SScrollBarProps<typeof BarTarget>>()
  expectTypeOf<InvalidTargetProps>().not.toMatchTypeOf<SScrollBarProps<typeof BarTarget>>()
  expectTypeOf<{component: 'div'}>().toMatchTypeOf<SScrollBarProps<'div'>>()
})
