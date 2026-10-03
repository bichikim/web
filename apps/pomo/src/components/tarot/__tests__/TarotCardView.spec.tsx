/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it} from 'vitest'
import {type DrawnTarotCard, TAROT_CARDS, type TarotLocale} from '../../../features/tarot'
import {TarotCardView} from '../TarotCardView'

it('should update the illustration, marker, and localized name when the drawn card or language changes', () => {
  const [card, setCard] = createSignal<DrawnTarotCard>({...TAROT_CARDS[0]!, orientation: 'upright'})
  const [locale, setLocale] = createSignal<TarotLocale>('en')
  render(() => <TarotCardView card={card()} locale={locale()} />)

  const article = screen.getByRole('article', {name: 'The Fool'})
  expect(article.querySelector('img')).toHaveAttribute('src', expect.stringContaining('fool.png'))
  expect(screen.queryByRole('heading', {name: 'The Fool'})).not.toBeInTheDocument()
  fireEvent.load(article.querySelector('img')!)
  expect(screen.getByRole('heading', {name: 'The Fool'})).toBeInTheDocument()
  expect(article).toHaveTextContent('0')

  setCard({...TAROT_CARDS.find((item) => item.id === 'pentacles-king')!, orientation: 'upright'})
  expect(
    screen.getByRole('article', {name: 'King of Pentacles'}).querySelector('img'),
  ).toHaveAttribute('src', expect.stringContaining('pentacles-king.png'))
  fireEvent.load(screen.getByRole('article', {name: 'King of Pentacles'}).querySelector('img')!)
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
}, 1_500)
