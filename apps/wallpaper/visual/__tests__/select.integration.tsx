import {cleanup, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import {SSelect} from '../../src/components/SSelect'

afterEach(cleanup)

it('should read and announce the current choice after removing the selected option', async () => {
  const initial = [
    {label: 'Sequential', value: 'sequential'},
    {label: 'Random', value: 'random'},
    {label: 'Reverse', value: 'reverse'},
  ]
  const [options, setOptions] = createSignal(initial)
  render(() => (
    <>
      <SSelect label="Order" options={options()} />
      <button onClick={() => setOptions([initial[2]!])}>Replace options</button>
    </>
  ))
  const select = page.getByRole('combobox', {name: 'Order'})
  await select.click()
  await userEvent.keyboard('{ArrowDown}{Enter}')
  await expect.element(select).toHaveTextContent('Random')

  await page.getByRole('button', {name: 'Replace options'}).click()
  await expect.element(select).toHaveTextContent('Reverse')
  await select.click()
  await expect
    .element(page.getByRole('option', {name: 'Reverse'}))
    .toHaveAttribute('aria-selected', 'true')
})
