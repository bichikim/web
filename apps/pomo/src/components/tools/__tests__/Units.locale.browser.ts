import {cleanup, render} from '@solidjs/testing-library'
import {createComponent} from 'solid-js'
import {afterEach, expect, it} from 'vitest'
import {page} from 'vitest/browser'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import {PreferenceProvider} from 'src/hooks/use-preference'
import {unitSelectionStorage} from 'src/features/tools'
import {Units} from '../Units'

const originalLocale = getLocale
const mount = () =>
  render(() =>
    createComponent(PreferenceProvider, {
      get children() {
        return createComponent(Units, {})
      },
    }),
  )
const selection = () => JSON.parse(localStorage.getItem('pomo:tool-units:v1') ?? 'null')
const unitButtons = () => page.getByRole('button', {expanded: false})
afterEach(() => {
  cleanup()
  overwriteGetLocale(originalLocale)
  localStorage.removeItem('pomo:tool-units:v1')
})

it('retains the saved unit across locales and removes it after an explicit replacement', async () => {
  overwriteGetLocale(() => 'ko')
  await unitSelectionStorage.write({category: 'area', from: 'pyeong', to: 'm2'})
  mount()
  await expect.element(page.getByText('3.30578512397 m²', {exact: true})).toBeVisible()
  cleanup()
  overwriteGetLocale(() => 'en')
  mount()
  await expect.element(page.getByText('3.30578512397 m²', {exact: true})).toBeVisible()
  expect(selection()).toEqual({category: 'area', from: 'pyeong', to: 'm2'})
  await unitButtons().nth(1).click()
  await expect.element(page.getByRole('option', {exact: true, name: '평'})).toBeVisible()
  await page.getByRole('option', {exact: true, name: 'm²'}).click()
  await expect.element(page.getByText('1 m²', {exact: true})).toBeVisible()
  await expect.poll(selection).toEqual({category: 'area', from: 'm2', to: 'm2'})
  await unitButtons().nth(1).click()
  await expect.element(page.getByRole('option', {exact: true, name: 'ft²'})).toBeVisible()
  expect(page.getByRole('option', {exact: true, name: '평'}).length).toBe(0)
  await page.getByRole('option', {exact: true, name: 'ft²'}).click()
  await expect.poll(selection).toEqual({category: 'area', from: 'ft2', to: 'm2'})
  await page.getByRole('button', {exact: true, name: 'Reset'}).click()
  await expect.poll(selection).toEqual({category: 'length', from: 'm', to: 'ft'})
})

it('keeps ordinary English area menus free of a new pyeong option', async () => {
  overwriteGetLocale(() => 'en')
  await unitSelectionStorage.write({category: 'area', from: 'm2', to: 'ft2'})
  mount()
  await expect.element(page.getByText('10.7639104167 ft²', {exact: true})).toBeVisible()
  await unitButtons().nth(1).click()
  await expect.element(page.getByRole('option', {exact: true, name: 'm²'})).toBeVisible()
  expect(page.getByRole('option', {exact: true, name: '평'}).length).toBe(0)
})
