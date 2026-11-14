import {expect, test} from 'vitest'
import {getCoverCamera} from '../cover-camera'

test('should cover a tall screen without stretching the wallpaper', () => {
  const camera = getCoverCamera({
    screen: {height: 900, width: 800},
    viewport: {height: 900, width: 1600},
  })
  expect(camera).toEqual({x: 400, y: 0, zoom: 1})
})

test('should cover a wide screen with a centered vertical crop', () => {
  const camera = getCoverCamera({
    screen: {height: 450, width: 1600},
    viewport: {height: 900, width: 1600},
  })
  expect(camera).toEqual({x: 0, y: 225, zoom: 1})
})

test('should keep the top of a square live wallpaper visible inside a laptop screen', () => {
  expect(
    getCoverCamera({
      screen: {height: 500, width: 800},
      verticalAlign: 'top',
      viewport: {height: 1024, width: 1024},
    }),
  ).toEqual({x: 0, y: 0, zoom: 0.78125})
})

test('should scale to a smaller screen with the same aspect ratio', () => {
  expect(
    getCoverCamera({screen: {height: 450, width: 800}, viewport: {height: 900, width: 1600}}),
  ).toEqual({x: 0, y: 0, zoom: 0.5})
})

test('should defer fitting while the host has no visible area', () => {
  expect(
    getCoverCamera({screen: {height: 0, width: 0}, viewport: {height: 900, width: 1600}}),
  ).toBeNull()
})
