/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {createModelHarness} from '../../__tests__/fixtures/model'
import {OfferForm} from '../OfferForm'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should request only the SKU and forward submission with the album id', () => {
  const {model, setSavingOffer} = createModelHarness()
  const view = render(() => <OfferForm albumId="album" albumTitle="앨범" model={model} />)
  expect(screen.getAllByRole('textbox')).toHaveLength(1)
  expect(screen.getByRole('textbox')).toBeRequired()
  expect(view.container.querySelector('input[name=albumId]')).toHaveValue('album')
  fireEvent.submit(view.container.querySelector('form')!)
  expect(model.handleOfferSubmit).toHaveBeenCalledOnce()
  setSavingOffer(true)
  expect(screen.getByRole('button', {name: '연결 중…'})).toBeDisabled()
})
