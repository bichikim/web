import {expect, test} from 'vitest'
import {preparePuppetDocument} from '@winter-love/puppet/player'
import originalUrl from '../fixtures/ash-notebook-hand.png?url'
import maskUrl from '../fixtures/ash-notebook-hand-mask.png?url'
import reference from '../fixtures/ash-notebook-hand.json'
import modelUrl from '../../../wallpaper-web/public/models/white-cat/model.poffo?url'

interface ImageArea {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

const readPixels = async (source: string, area?: ImageArea) => {
  const image = new Image()
  image.src = source
  await image.decode()
  const region = area ?? {height: image.height, width: image.width, x: 0, y: 0}
  const canvas = document.createElement('canvas')
  canvas.width = region.width
  canvas.height = region.height
  const context = canvas.getContext('2d')!
  context.drawImage(
    image,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    region.width,
    region.height,
  )
  return context.getImageData(0, 0, region.width, region.height).data
}

test('should preserve every protected hand pixel and keep the original wrist length', async () => {
  const prepared = await preparePuppetDocument({
    source: await fetch(modelUrl).then((response) => response.blob()),
  })
  if (!prepared.ok) {
    throw new Error('Invalid Ash')
  }
  const hand = prepared.document.parts.find((part) => part.id === reference.hand)!
  const arm = prepared.document.parts.find((part) => part.id === reference.arm)!
  const [original, actual, mask] = await Promise.all([
    readPixels(originalUrl),
    readPixels(hand.texture.src, reference.crop),
    readPixels(maskUrl),
  ])
  let protectedRgbDelta = 0
  let protectedAlphaDelta = 0
  let alphaIncrease = 0
  let changedPixels = 0
  for (let offset = 0; offset < original.length; offset += 4) {
    const difference = [0, 1, 2, 3].map((channel) =>
      Math.abs(actual[offset + channel]! - original[offset + channel]!),
    )
    if (mask[offset] === 0) {
      protectedRgbDelta = Math.max(protectedRgbDelta, ...difference.slice(0, 3))
      protectedAlphaDelta = Math.max(protectedAlphaDelta, difference[3]!)
    } else if (difference.some((delta) => delta > 0)) {
      changedPixels += 1
    }
    alphaIncrease = Math.max(alphaIncrease, actual[offset + 3]! - original[offset + 3]!)
  }
  expect(
    protectedRgbDelta,
    'Fingers, nails, upper palm and all unselected pixels stay original',
  ).toBe(0)
  expect(protectedAlphaDelta, 'Protected silhouette stays original').toBe(0)
  expect(alphaIncrease, 'The wrist cannot extend beyond the original painted hand').toBe(0)
  expect(changedPixels, 'The lower hand needs the requested generated repair').toBeGreaterThan(0)
  const bytes = Uint8Array.from(atob(arm.texture.src.split(',')[1]!), (value) =>
    value.charCodeAt(0),
  )
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const hash = [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
  expect(hash, 'The original forearm artwork stays untouched').toBe(reference.armTextureSha256)
}, 60_000)
