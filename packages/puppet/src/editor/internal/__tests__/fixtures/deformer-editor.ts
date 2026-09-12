import {vi} from 'vitest'
import {
  createDemoDocument,
  type PuppetDocument,
  type PuppetSceneDeformerNode,
  type PuppetSceneNode,
} from '../../../../player'

const GRID_SIZE = 100

const partNode: PuppetSceneNode = {
  id: 'mesh-preview',
  kind: 'part',
  locked: false,
  name: 'Part',
  visible: true,
}

export const createDeformer = (
  children: ReadonlyArray<PuppetSceneNode> = [partNode],
): PuppetSceneDeformerNode => ({
  bounds: {height: 100, width: 100, x: 0, y: 0},
  children,
  columns: 1,
  controlPoints: [0, 0, GRID_SIZE, 0, 0, GRID_SIZE, GRID_SIZE, GRID_SIZE],
  id: 'deformer',
  kind: 'deformer',
  locked: false,
  name: 'Deformer',
  rotationOrigin: {x: 50, y: 50},
  rows: 1,
  visible: true,
})

export const createDocument = (root: PuppetSceneNode): PuppetDocument => ({
  ...createDemoDocument(),
  scene: {roots: [root]},
})

export const mockViewportBounds = (svg: SVGSVGElement) =>
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    bottom: 720,
    height: 720,
    left: 0,
    right: 960,
    toJSON: () => ({}),
    top: 0,
    width: 960,
    x: 0,
    y: 0,
  })

export const getEditorSvg = (container: HTMLElement) => {
  const svg = container.querySelector<SVGSVGElement>('svg')

  if (svg === null) {
    throw new Error('Expected the deformer editor SVG to render.')
  }

  return svg
}
