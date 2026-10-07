/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {
  type DrawnTarotCard,
  TAROT_CARDS,
  type TarotDrawCount,
  type TarotLocale,
} from '../../../features/tarot'
import {Spread} from '../Spread'

afterEach(() => vi.unstubAllGlobals())

it('should keep tarot labels and scrolling after the spread changes', async () => {
  let resize = () => {}
  const disconnect = vi.fn()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resize = callback
      }
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = disconnect
    },
  )
  const [count, setCount] = createSignal<TarotDrawCount>(5)
  const view = render(() => <Spread cards={[]} count={count()} locale="ko" />)
  const region = screen.getByRole('region', {name: '타로'})
  const scrollBy = vi.fn()
  let contentWidth = 1000
  Object.defineProperties(region, {
    clientWidth: {configurable: true, value: 300},
    scrollBy: {value: scrollBy},
    scrollWidth: {get: () => contentWidth},
  })

  resize()
  expect(screen.queryByRole('button', {name: '이전 카드 보기'})).toBeNull()
  const next = screen.getByRole('button', {name: '다음 카드 보기'})
  next.focus()
  fireEvent.click(next)
  expect(scrollBy).toHaveBeenLastCalledWith({left: 240})
  expect(region).toHaveFocus()

  region.scrollLeft = 240
  fireEvent.scroll(region)
  expect(screen.getByRole('button', {name: '이전 카드 보기'})).toBeInTheDocument()
  expect(screen.getByRole('button', {name: '다음 카드 보기'})).toBeInTheDocument()
  region.scrollLeft = 699.5
  fireEvent.scroll(region)
  expect(screen.queryByRole('button', {name: '다음 카드 보기'})).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '이전 카드 보기'}))
  expect(scrollBy).toHaveBeenLastCalledWith({left: -240})

  region.scrollLeft = 0
  contentWidth = 300
  setCount(1)
  await waitFor(() => expect(screen.queryAllByRole('button')).toHaveLength(0))
  contentWidth = 1000
  setCount(5)
  await waitFor(() =>
    expect(screen.getByRole('button', {name: '다음 카드 보기'})).toBeInTheDocument(),
  )
  Object.defineProperty(region, 'clientWidth', {value: 1000})
  resize()
  expect(screen.queryAllByRole('button')).toHaveLength(0)
  view.unmount()
  expect(disconnect).toHaveBeenCalledOnce()
})

it('should give five placeholders and drawn cards the same ordered positions and update the locale and spread', () => {
  const [cards, setCards] = createSignal<ReadonlyArray<DrawnTarotCard>>([])
  const [count, setCount] = createSignal<TarotDrawCount>(5)
  const [locale, setLocale] = createSignal<TarotLocale>('ko')
  render(() => <Spread cards={cards()} count={count()} locale={locale()} />)
  const region = screen.getByRole('region', {name: '타로'})
  const positions = ['현재 상황', '막히는 점', '도움이 되는 점', '조언', '예상 흐름']
  positions.forEach((position) => expect(within(region).getByText(position)).toBeInTheDocument())
  expect(within(region).queryAllByRole('article')).toHaveLength(0)

  const selected = TAROT_CARDS.slice(0, 5).map((card) => ({
    ...card,
    orientation: 'reversed' as const,
  }))
  setCards(selected)
  expect(
    within(region)
      .getAllByRole('article')
      .map((article) => article.getAttribute('aria-label')),
  ).toEqual(positions)
  selected.forEach((card, index) => {
    const article = within(region).getByRole('article', {name: positions[index]})
    fireEvent.load(article.querySelector('img')!)
    fireEvent.load(article.querySelectorAll('img')[1]!)
    expect(article).toHaveTextContent(card.name.ko)
    expect(article).toHaveTextContent('역방향')
    expect(article.querySelector('img')!.parentElement!.parentElement).not.toHaveClass('rotate-180')
  })

  setLocale('en')
  expect(
    within(region)
      .getAllByRole('article')
      .map((article) => article.getAttribute('aria-label')),
  ).toEqual(['Current situation', 'Obstacle', 'Support', 'Advice', 'Possible outcome'])
  setCount(3)
  expect(within(region).getByRole('article', {name: 'Possible outcome'})).toBeInTheDocument()
  setCards(selected.slice(0, 3))
  expect(
    within(region)
      .getAllByRole('article')
      .map((article) => article.getAttribute('aria-label')),
  ).toEqual(['Past', 'Present', 'Future'])
})
