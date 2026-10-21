import stylesheet from 'viewer-hover-styles'
import {COLUMN_PIXELS, ROW_PIXELS, svgDocument, svgElement} from './graphics.js'
/** Paints only the translucent row hover background using the original palette. */
export const treeHoverGraphics = (columns) =>
  svgDocument({
    content: svgElement('rect', {class: 'fill-hover', height: ROW_PIXELS, rx: 6, width: '100%'}),
    height: ROW_PIXELS,
    stylesheet,
    width: columns * COLUMN_PIXELS,
  })
