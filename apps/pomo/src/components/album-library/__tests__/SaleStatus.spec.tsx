/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@solidjs/testing-library'
import {type ComponentProps, createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {AlbumSaleStatus} from '../SaleStatus'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should show the sale status with a price only when one is provided', () => {
  const [sale, setSale] = createSignal<ComponentProps<typeof AlbumSaleStatus>['sale']>({
    priceLabel: '₩4,900',
    state: 'configured',
    statusLabel: '판매 중',
  })
  render(() => <AlbumSaleStatus sale={sale()} />)
  expect(screen.getByText('₩4,900')).toBeVisible()
  expect(screen.getByText('판매 중')).toBeVisible()
  setSale({state: 'preparing', statusLabel: '판매 준비 중'})
  expect(screen.queryByText('₩4,900')).not.toBeInTheDocument()
  expect(screen.getByText('판매 준비 중')).toBeVisible()
})
