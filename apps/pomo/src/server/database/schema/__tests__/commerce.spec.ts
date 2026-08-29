import {getTableConfig} from 'drizzle-orm/pg-core'
import {expect, it} from 'vitest'

import {
  commerceEntitlementGrants,
  commerceOffers,
  commerceOrderItems,
  commerceOrders,
  commerceProductAlbums,
  commerceProducts,
  commerceProviderEvents,
} from '../commerce'

it('should allow only one offer per product and provider', () => {
  const offerIndexes = getTableConfig(commerceOffers).indexes
  const productProviderIndex = offerIndexes.find(
    (index) => index.config.name === 'commerce_offers_product_provider_index',
  )

  expect(productProviderIndex?.config.unique).toBe(true)
  expect(productProviderIndex?.config.columns).toHaveLength(2)
})

it.each([
  [commerceProducts, 1],
  [commerceProductAlbums, 1],
  [commerceOffers, 3],
  [commerceOrders, 6],
  [commerceOrderItems, 5],
  [commerceEntitlementGrants, 4],
  [commerceProviderEvents, 2],
])('should expose the table constraints and indexes', (table, expectedConstraintCount) => {
  const config = getTableConfig(table)

  for (const foreignKey of config.foreignKeys) {
    expect(foreignKey.getName()).toMatch(/_fk$/u)
  }

  expect(config.indexes.length + config.checks.length + config.primaryKeys.length).toBe(
    expectedConstraintCount,
  )
})
