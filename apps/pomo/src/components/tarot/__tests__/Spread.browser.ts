import {cleanup, render} from '@solidjs/testing-library'
import {createComponent, createSignal} from 'solid-js'
import {afterEach, expect, it} from 'vitest'
import {page} from 'vitest/browser'
import {type DrawnTarotCard, TAROT_CARDS} from '../../../features/tarot'
import {Spread} from '../Spread'

afterEach(cleanup)

it.each([
  {locale: 'ko', position: '현재'},
  {locale: 'en', position: 'Present'},
] as const)('should label a single drawn card in $locale', async ({locale, position}) => {
  const [cards, setCards] = createSignal<ReadonlyArray<DrawnTarotCard>>([])
  render(() =>
    createComponent(Spread, {
      get cards() {
        return cards()
      },
      count: 1,
      locale,
    }),
  )
  await expect.element(page.getByText(position, {exact: true})).toBeVisible()

  setCards([{...TAROT_CARDS[0]!, orientation: 'upright'}])

  await expect.element(page.getByRole('article', {name: position})).toBeVisible()
})
