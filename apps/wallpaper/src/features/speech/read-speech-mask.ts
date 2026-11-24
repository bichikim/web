import {createHitMask, type HitMask, resolveClipPolygon} from '../hit-test'

interface ReadSpeechMaskProps {
  readonly canvas: HTMLCanvasElement
  readonly element: HTMLElement
}
const MAXIMUM_EDGE = 512

const paint = (context: CanvasRenderingContext2D, card: HTMLElement) => {
  if (card.inert || getComputedStyle(card).visibility !== 'visible') {
    return
  }
  const bubble = card.querySelector('aside > [aria-hidden="true"]')
  if (bubble === null) {
    return
  }
  const rect = bubble.getBoundingClientRect()
  const style = getComputedStyle(bubble)
  const preview = card.firstElementChild ?? card
  const bounds = preview.getBoundingClientRect()
  const clip = resolveClipPolygon({
    height: bounds.height,
    value: getComputedStyle(preview).clipPath,
    width: bounds.width,
  })
  context.save()
  if (clip !== null) {
    context.beginPath()
    clip.forEach((point, index) => {
      if (index === 0) {
        context.moveTo(bounds.x + point.x, bounds.y + point.y)
      } else {
        context.lineTo(bounds.x + point.x, bounds.y + point.y)
      }
    })
    context.closePath()
    context.clip()
  }
  context.beginPath()
  context.roundRect(rect.x, rect.y, rect.width, rect.height, [
    Number.parseFloat(style.borderTopLeftRadius),
    Number.parseFloat(style.borderTopRightRadius),
    Number.parseFloat(style.borderBottomRightRadius),
    Number.parseFloat(style.borderBottomLeftRadius),
  ])
  context.fill()
  context.restore()
}

/** Samples visible bubble bodies and exposed headers, excluding shadows and noninteractive tails. */
export const readSpeechMask = (props: ReadSpeechMaskProps): HitMask => {
  const scale = Math.min(1, MAXIMUM_EDGE / Math.max(innerWidth, innerHeight))
  const width = Math.max(1, Math.round(innerWidth * scale))
  const height = Math.max(1, Math.round(innerHeight * scale))
  if (props.canvas.width !== width || props.canvas.height !== height) {
    props.canvas.width = width
    props.canvas.height = height
  }
  const context = props.canvas.getContext('2d', {willReadFrequently: true})
  if (context === null) {
    throw new Error('Cannot sample speech input regions')
  }
  context.clearRect(0, 0, width, height)
  context.save()
  context.scale(width / innerWidth, height / innerHeight)
  if (props.element.isConnected) {
    props.element
      .querySelectorAll<HTMLElement>('[role="listitem"]')
      .forEach((card) => paint(context, card))
    props.element.querySelectorAll<HTMLElement>('[popover]:popover-open').forEach((popup) => {
      const rect = popup.getBoundingClientRect()
      const style = getComputedStyle(popup)
      context.beginPath()
      context.roundRect(
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        Number.parseFloat(style.borderTopLeftRadius),
      )
      context.fill()
    })
  }
  context.restore()
  const pixels = context.getImageData(0, 0, width, height)
  return createHitMask({alphaThreshold: 127, data: pixels.data, height, width})
}
