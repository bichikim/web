/** @vitest-environment jsdom */

import {fireEvent, render, screen, within} from '@solidjs/testing-library'
import {createSignal, type JSX} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {type DrawnTarotCard, TAROT_CARDS, type TarotLocale} from '../../../features/tarot'
import {TarotCardDepthView} from '../TarotCardDepthView'
import {TarotCardView} from '../TarotCardView'

const depthRendererMocks = vi.hoisted(() => ({
  destroy: vi.fn(() => undefined),
  initialize: vi.fn(
    async (_options: {
      canvas: HTMLCanvasElement
      depth: string
      frame: string
      image: string
      marker: string
      name: string
    }) => true,
  ),
  render: vi.fn(
    (_frame: {height: number; reversed: boolean; width: number; x: number; y: number}) => undefined,
  ),
}))

vi.mock('@solidjs/start', () => ({
  clientOnly: (_loader: () => Promise<unknown>) => (props: {fallback?: JSX.Element}) =>
    props.fallback,
}))
vi.mock('src/features/tarot-depth', () => ({
  TarotDepthRenderer: class {
    destroy = depthRendererMocks.destroy
    initialize = depthRendererMocks.initialize
    render = depthRendererMocks.render
  },
}))

it('should update the illustration, marker, and localized name when the drawn card or language changes', () => {
  const [card, setCard] = createSignal<DrawnTarotCard>({...TAROT_CARDS[0]!, orientation: 'upright'})
  const [locale, setLocale] = createSignal<TarotLocale>('en')
  render(() => <TarotCardView card={card()} locale={locale()} />)

  const article = screen.getByRole('article', {name: 'The Fool'})
  expect(article.querySelector('img')).toHaveAttribute('src', expect.stringContaining('fool.png'))
  expect(screen.queryByRole('heading', {name: 'The Fool'})).not.toBeInTheDocument()
  fireEvent.load(article.querySelector('img')!)
  fireEvent.load(article.querySelectorAll('img')[1]!)
  expect(screen.getByRole('heading', {name: 'The Fool'})).toBeInTheDocument()
  expect(article).toHaveTextContent('0')

  setCard({...TAROT_CARDS.find((item) => item.id === 'pentacles-king')!, orientation: 'upright'})
  expect(
    screen.getByRole('article', {name: 'King of Pentacles'}).querySelector('img'),
  ).toHaveAttribute('src', expect.stringContaining('pentacles-king.png'))
  fireEvent.load(screen.getByRole('article', {name: 'King of Pentacles'}).querySelector('img')!)
  fireEvent.load(
    screen.getByRole('article', {name: 'King of Pentacles'}).querySelectorAll('img')[1]!,
  )
  expect(screen.getByRole('article', {name: 'King of Pentacles'})).toHaveTextContent('King')

  setLocale('ko')
  expect(screen.getByRole('heading', {name: '펜타클 왕'})).toBeInTheDocument()
  expect(screen.getByRole('article', {name: '펜타클 왕'})).toHaveTextContent('왕')
})

it('should rotate the entire reversed card while keeping its direction label readable', () => {
  const [orientation, setOrientation] = createSignal<'upright' | 'reversed'>('reversed')
  render(() => (
    <TarotCardView
      card={{...TAROT_CARDS[0]!, orientation: orientation()}}
      locale="ko"
      showUpright={false}
    />
  ))
  const article = screen.getByRole('article', {name: '광대'})
  const frame = article.querySelector('img')!.parentElement!.parentElement!
  expect(frame).toHaveClass('rotate-180')
  expect(article).toHaveTextContent('역방향')
  expect(frame).not.toHaveTextContent('역방향')
  setOrientation('upright')
  expect(frame).not.toHaveClass('rotate-180')
  expect(article).toHaveTextContent('정방향')
})

it('should show a reversed card upright by default without changing its direction label', () => {
  const [showUpright, setShowUpright] = createSignal<boolean | undefined>(undefined)
  render(() => (
    <TarotCardView
      card={{...TAROT_CARDS[0]!, orientation: 'reversed'}}
      locale="ko"
      showUpright={showUpright()}
    />
  ))
  const article = screen.getByRole('article', {name: '광대'})
  const frame = article.querySelector('img')!.parentElement!.parentElement!
  expect(frame).not.toHaveClass('rotate-180')
  expect(article).toHaveTextContent('역방향')

  setShowUpright(false)
  expect(frame).toHaveClass('rotate-180')
  setShowUpright(true)
  expect(frame).not.toHaveClass('rotate-180')
  expect(article).toHaveTextContent('역방향')
})

it('should replace the loading card with a readable localized name when artwork fails', () => {
  const [locale, setLocale] = createSignal<TarotLocale>('ko')
  render(() => (
    <TarotCardView
      card={{...TAROT_CARDS[0]!, orientation: 'reversed'}}
      locale={locale()}
      showUpright={false}
    />
  ))
  const article = screen.getByRole('article', {name: '광대'})
  const image = article.querySelector('img')!
  const frame = image.parentElement!.parentElement!
  expect(image.parentElement).toHaveAttribute('aria-busy', 'true')
  expect(screen.queryByRole('heading', {name: '광대'})).not.toBeInTheDocument()
  fireEvent.error(image)
  expect(image.parentElement).toHaveAttribute('aria-busy', 'false')
  const name = screen.getByRole('heading', {name: '광대'})
  expect(frame).toHaveClass('rotate-180')
  expect(name).toHaveClass('rotate-180')
  expect(article).toHaveTextContent('역방향')
  setLocale('en')
  expect(screen.getByRole('heading', {name: 'The Fool'})).toBeInTheDocument()
})

it('should show a readable name when the separate frame fails on a reversed card', () => {
  render(() => (
    <TarotCardView
      card={{...TAROT_CARDS[0]!, orientation: 'reversed'}}
      locale="ko"
      showUpright={false}
    />
  ))
  const article = screen.getByRole('article', {name: '광대'})
  fireEvent.load(article.querySelector('img')!)
  fireEvent.error(article.querySelectorAll('img')[1]!)
  expect(screen.getByRole('heading', {name: '광대'})).toHaveClass('rotate-180')
  expect(article).toHaveTextContent('역방향')
})

describe('TarotCardDepthView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    depthRendererMocks.initialize.mockResolvedValue(true)
  })

  afterEach(() => vi.unstubAllGlobals())

  it('should expose the accessible depth surface and release initialized view resources', async () => {
    const preference = new EventTarget()
    const resizeObserver = {disconnect: vi.fn(), observe: vi.fn()}
    vi.stubGlobal('matchMedia', () => ({
      addEventListener: preference.addEventListener.bind(preference),
      matches: false,
      removeEventListener: preference.removeEventListener.bind(preference),
    }))
    vi.stubGlobal(
      'ResizeObserver',
      class {
        disconnect = resizeObserver.disconnect
        observe = resizeObserver.observe

        constructor(_callback: ResizeObserverCallback) {}
      },
    )

    const view = render(() => (
      <TarotCardDepthView
        card={{...TAROT_CARDS[0]!, orientation: 'reversed'}}
        locale="ko"
        showUpright={false}
      />
    ))
    const surface = screen.getByRole('group', {name: '광대'})
    const hint = surface.querySelector('p')!
    const canvas = surface.querySelector('canvas')!
    expect(surface).toHaveAttribute('aria-describedby', hint.id)
    expect(surface).toHaveAttribute('tabindex', '0')
    expect(hint).toHaveClass('sr-only')
    expect(canvas).toHaveAttribute('aria-hidden', 'true')
    expect(resizeObserver.observe).toHaveBeenCalledWith(canvas)

    await Promise.resolve()
    await Promise.resolve()
    expect(depthRendererMocks.initialize).toHaveBeenCalledOnce()
    expect(depthRendererMocks.initialize.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({marker: '0', name: '광대'}),
    )
    expect(canvas).not.toHaveClass('invisible')
    expect(surface.querySelector('div[aria-hidden="true"]')).toHaveClass('invisible')
    expect(depthRendererMocks.render).toHaveBeenLastCalledWith(
      expect.objectContaining({reversed: true, x: 0, y: 0}),
    )

    view.unmount()
    expect(depthRendererMocks.destroy).toHaveBeenCalledOnce()
    expect(resizeObserver.disconnect).toHaveBeenCalledOnce()
  })
})

describe('card enlargement', () => {
  const showModal = vi.fn(function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  })
  const close = vi.fn(function close(this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  })

  beforeEach(() => {
    showModal.mockClear()
    close.mockClear()
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: showModal,
    })
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {configurable: true, value: close})
  })
  afterEach(() => {
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
  })

  it('should enlarge the selected artwork and preserve the reversed view without dismissing on card clicks', () => {
    render(() => (
      <TarotCardView
        card={{...TAROT_CARDS[0]!, orientation: 'reversed'}}
        locale="ko"
        showUpright={false}
      />
    ))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', {name: '광대 크게 보기'}))
    const dialog = screen.getByRole('dialog', {name: '광대'})
    expect(showModal).toHaveBeenCalledOnce()
    const image = dialog.querySelector('img')!
    expect(image).toHaveAttribute('src', expect.stringContaining('fool.png'))
    fireEvent.load(image)
    fireEvent.load(dialog.querySelectorAll('img')[1]!)
    expect(within(dialog).getByRole('heading', {name: '광대'})).toBeInTheDocument()
    const frame = image.parentElement!.parentElement!
    expect(frame).toHaveClass('rotate-180')
    fireEvent.pointerDown(frame)
    expect(dialog).toHaveAttribute('open')
    expect(close).not.toHaveBeenCalled()
    const parentEscape = vi.fn()
    dialog.parentElement!.addEventListener('keydown', parentEscape)
    fireEvent.keyDown(dialog, {key: 'Escape'})
    expect(parentEscape).not.toHaveBeenCalled()
  })

  it.each(['button', 'backdrop', 'escape'] as const)(
    'should dismiss enlargement through %s while keeping the drawn card',
    (action) => {
      render(() => (
        <TarotCardView card={{...TAROT_CARDS[0]!, orientation: 'upright'}} locale="ko" />
      ))
      fireEvent.click(screen.getByRole('button', {name: '광대 크게 보기'}))
      const dialog = screen.getByRole('dialog', {name: '광대'})
      switch (action) {
        case 'button':
          fireEvent.click(within(dialog).getByRole('button', {name: '닫기'}))
          break
        case 'backdrop':
          fireEvent.pointerDown(dialog)
          break
        case 'escape':
          fireEvent(dialog, new Event('cancel', {cancelable: true}))
          break
        default: {
          const unexpected: never = action
          throw new Error(`Unexpected dismissal: ${unexpected}`)
        }
      }
      expect(close).toHaveBeenCalledOnce()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.getByRole('article', {name: '광대'})).toBeInTheDocument()
      expect(screen.getByRole('button', {name: '광대 크게 보기'})).toBeInTheDocument()
    },
  )
})
