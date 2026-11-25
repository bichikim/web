import type {PuppetGroupRenderProperties} from '../document'

/** Whether descendants sort within this group before the group sorts with its siblings. */
export const isGroupDrawOrderUnit = (properties: PuppetGroupRenderProperties | undefined) =>
  properties?.drawOrder !== undefined ||
  properties?.isolateOrder === true ||
  properties?.offscreen === true
