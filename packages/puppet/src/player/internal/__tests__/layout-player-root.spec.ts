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
