import {bubblePath} from './bubble-path'
import {createHitMask, type HitMask, resolveClipPolygon} from '../hit-test'

interface ReadSpeechMaskProps {
  readonly canvas: HTMLCanvasElement
  readonly element: HTMLElement
}
const MAXIMUM_EDGE = 512

const paint = (context: CanvasRenderingContext2D, card: HTMLElement) => {
  const bubble = card.querySelector('aside > [aria-hidden="true"]')
  if (bubble === null) {
    return
  }
  const rect = bubble.getBoundingClientRect()
  const reveal = Number.parseFloat(getComputedStyle(bubble).getPropertyValue('--speech-reveal'))
  const path = bubblePath({
    anchor: bubble.getAttribute('data-anchor') === 'top' ? 'top' : 'bottom',
    height: rect.height,
    reveal: Number.isFinite(reveal) ? reveal : 1,
    width: rect.width,
  })
  const bounds = card.getBoundingClientRect()
  const clip = resolveClipPolygon({
    height: bounds.height,
    value: getComputedStyle(card).clipPath,
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
  context.translate(rect.x, rect.y)
  context.fill(new Path2D(path))
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
  }
  context.restore()
  const pixels = context.getImageData(0, 0, width, height)
  return createHitMask({alphaThreshold: 127, data: pixels.data, height, width})
}
