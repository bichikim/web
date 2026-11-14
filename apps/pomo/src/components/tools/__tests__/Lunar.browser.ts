import {cleanup, render} from '@solidjs/testing-library'
import {createComponent} from 'solid-js'
import {afterEach, beforeEach, expect, it} from 'vitest'
import {page} from 'vitest/browser'

import {PreferenceProvider} from 'src/hooks/use-preference'
import {lunarDirectionStorage} from 'src/features/tools'
import {Lunar} from '../Lunar'

const mount = () =>
  render(() =>
    createComponent(PreferenceProvider, {
      get children() {
        return createComponent(Lunar, {})
      },
    }),
  )

const choose = async (label: string, value: string) => {
  await page.getByRole('button', {name: new RegExp(label, 'u')}).click()
  await page.getByRole('option', {exact: true, name: value}).click()
}

beforeEach(async () => {
  await lunarDirectionStorage.write('lunar')
  mount()
  await expect.element(page.getByText('2026-02-17', {exact: true})).toBeVisible()
})

afterEach(() => {
  cleanup()
  localStorage.removeItem('pomo:tool-lunar-direction:v1')
})

it('should retain the corrected day after returning from a shorter month', async () => {
  await choose('음력 일', '30')
  await choose('음력 월', '2')
  await expect.element(page.getByRole('button', {name: /음력 일/u})).toHaveTextContent('29')

  await choose('음력 월', '1')

  await expect.element(page.getByRole('button', {name: /음력 일/u})).toHaveTextContent('29')
})

it('should retain the cutoff day when returning to a fully supported month', async () => {
  await choose('음력 일', '30')
  await choose('음력 연도', '2050')
  await choose('음력 월', '11')
  await expect.element(page.getByRole('button', {name: /음력 일/u})).toHaveTextContent('18')
  await expect.element(page.getByText('2050-12-31', {exact: true})).toBeVisible()

  await choose('음력 월', '10')

  await expect.element(page.getByRole('button', {name: /음력 일/u})).toHaveTextContent('18')
})

it('should retain the corrected day when leaving a shorter leap month', async () => {
  await choose('음력 연도', '1900')
  await choose('음력 월', '8')
  await choose('음력 일', '30')
  await expect.element(page.getByText('1900-09-23', {exact: true})).toBeVisible()
  await page.getByText('윤달', {exact: true}).click()
  await expect.element(page.getByRole('button', {name: /음력 일/u})).toHaveTextContent('29')
  await expect.element(page.getByText('1900-10-22', {exact: true})).toBeVisible()

  await page.getByText('윤달', {exact: true}).click()

  await expect.element(page.getByRole('button', {name: /음력 일/u})).toHaveTextContent('29')
})
