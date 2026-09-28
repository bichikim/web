/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {createModelHarness} from '../../__tests__/fixtures/model'
import {OfferForm} from '../OfferForm'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should expose provider and Paddle pricing fields and forward submission', () => {
  const {model, setSavingOffer} = createModelHarness()
  const view = render(() => <OfferForm albumId="album" albumTitle="앨범" model={model} />)
  expect(screen.getByRole('combobox', {name: '판매 채널'})).toHaveValue('apps-in-toss')
  expect(screen.getByRole('textbox', {name: '외부 상품 ID'})).toBeRequired()
  expect(screen.getByText('Paddle 웹 가격')).toBeTruthy()
  expect(view.container.querySelector('input[name=albumId]')).toHaveValue('album')
  fireEvent.submit(view.container.querySelector('form')!)
  expect(model.handleOfferSubmit).toHaveBeenCalledOnce()
  setSavingOffer(true)
  expect(screen.getByRole('button', {name: '연결 중…'})).toBeDisabled()
})
