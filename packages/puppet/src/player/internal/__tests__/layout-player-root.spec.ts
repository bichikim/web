import {expect, test, vi} from 'vitest'
import type {Container} from 'pixi.js'
import {createEmptyDocument} from '../../create-empty-document'
import {layoutPlayerRoot} from '../layout-player-root'
test('should apply camera position and zoom without changing model coordinates', () => {
  const root = {position: {set: vi.fn()}, scale: {set: vi.fn()}}
  layoutPlayerRoot({
    camera: {x: 30, y: -20, zoom: 2},
    document: createEmptyDocument(),
    root: root as unknown as Container,
    screen: {height: 400, width: 600},
  })
  expect(root.scale.set).toHaveBeenCalledWith(2)
  expect(root.position.set).toHaveBeenCalledWith(-60, 40)
})
test('should retain automatic fitting when no explicit camera is provided', () => {
  const root = {position: {set: vi.fn()}, scale: {set: vi.fn()}}
  const document = {...createEmptyDocument(), viewport: {height: 200, width: 400}}
  layoutPlayerRoot({
    document,
    root: root as unknown as Container,
    screen: {height: 400, width: 600},
  })
  expect(root.scale.set).toHaveBeenCalledWith(1.5)
  expect(root.position.set).toHaveBeenCalledWith(0, 50)
})

test.each([
  {height: 200, scale: 2, width: 400, x: -100, y: 0},
  {height: 400, scale: 3, width: 200, x: 0, y: -400},
])('should cover the screen with one uniform scale for a $width × $height document', (viewport) => {
  const root = {position: {set: vi.fn()}, scale: {set: vi.fn()}}
  layoutPlayerRoot({
    document: {...createEmptyDocument(), viewport},
    fit: 'cover',
    root: root as unknown as Container,
    screen: {height: 400, width: 600},
  })
  expect(root.scale.set).toHaveBeenCalledWith(viewport.scale)
  expect(root.position.set).toHaveBeenCalledWith(viewport.x, viewport.y)
})

test('should cover the authored layout rectangle using its alignment', () => {
  const root = {position: {set: vi.fn()}, scale: {set: vi.fn()}}
  layoutPlayerRoot({
    document: {
      ...createEmptyDocument(),
      layout: {align: [1, 0], height: 100, width: 200, x: 10, y: 20},
    },
    fit: 'cover',
    root: root as unknown as Container,
    screen: {height: 400, width: 600},
  })
  expect(root.scale.set).toHaveBeenCalledWith(4)
  expect(root.position.set).toHaveBeenCalledWith(-240, -80)
})
