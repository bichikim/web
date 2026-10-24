/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {type JSX} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

let attachRef = false
let setListElement: ((element: HTMLDivElement | undefined) => void) | undefined

vi.mock('@kobalte/core/tabs', () => {
  const Tabs = (props: {readonly children: JSX.Element}) => <>{props.children}</>
  Object.assign(Tabs, {
    List: (props: {
      readonly children: JSX.Element
      readonly onScroll: JSX.EventHandler<HTMLDivElement, Event>
      readonly ref: (element: HTMLDivElement | undefined) => void
    }) => (
      <div
        onScroll={props.onScroll}
        ref={(element) => {
          setListElement = props.ref
          if (attachRef) {
            props.ref(element)
          }
        }}
        role="tablist"
      >
        {props.children}
      </div>
    ),
    Trigger: (props: {readonly children: JSX.Element}) => <span>{props.children}</span>,
  })
  return {Tabs}
})

import {PSettingsTabList} from '../TabList'

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect() {}
      observe() {}
    },
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

it('should tolerate a missing tab list while initializing', () => {
  attachRef = false
  render(() => <PSettingsTabList />)

  expect(screen.getByRole('tablist')).toBeInTheDocument()
})

it('should ignore scrolling after the tab list reference is cleared', () => {
  attachRef = true
  render(() => <PSettingsTabList />)
  const tabList = screen.getByRole('tablist')
  Object.defineProperties(tabList, {
    clientWidth: {configurable: true, value: 100},
    scrollLeft: {configurable: true, value: 20},
    scrollWidth: {configurable: true, value: 300},
  })
  fireEvent.scroll(tabList)
  const scrollButton = screen.getAllByRole('button')[0]!

  setListElement?.(undefined)
  fireEvent.click(scrollButton)
})
