import type {PuppetDocument} from '../../player'

export const getMaskUsageCount = (document: PuppetDocument, partId: string) =>
  document.parts.filter((part) => part.properties?.clippingMaskIds?.includes(partId)).length
