import {getTableConfig} from 'drizzle-orm/pg-core'
import {expect, it} from 'vitest'

import {commerceOffers} from '../commerce'

it('should allow only one offer per product and provider', () => {
  const offerIndexes = getTableConfig(commerceOffers).indexes
  const productProviderIndex = offerIndexes.find(
    (index) => index.config.name === 'commerce_offers_product_provider_index',
  )

  expect(productProviderIndex?.config.unique).toBe(true)
  expect(productProviderIndex?.config.columns).toHaveLength(2)
})
