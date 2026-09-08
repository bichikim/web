import {readFile} from 'node:fs/promises'
import {VertexBuffer} from '@babylonjs/core/Buffers/buffer'
import {NullEngine} from '@babylonjs/core/Engines/nullEngine'
import {LoadAssetContainerAsync} from '@babylonjs/core/Loading/sceneLoader'
import {Matrix, Vector3} from '@babylonjs/core/Maths/math.vector'
import {Scene} from '@babylonjs/core/scene'
import '@babylonjs/loaders/glTF'
import {expect, it} from 'vitest'
import {createSeatedArms} from '../seated-arms'

it.each(['vroid.glb', 'haru.vrm'])(
  'should deform actual finger skin for %s',
  async (filename) => {
    const engine = new NullEngine()
    const scene = new Scene(engine)
    const bytes = await readFile(`apps/pomo/public/assets/character-studio/${filename}`)
    const container = await LoadAssetContainerAsync(bytes, scene, {
      pluginExtension: '.glb',
      pluginOptions: {gltf: {skipMaterials: true}},
    })
    container.addAllToScene()
    const thumbs = ['L', 'R'].map((side) => {
      const hand = container.transformNodes.find((node) => node.name === `J_Bip_${side}_Hand`)!
      const thumb = container.transformNodes.find((node) => node.name === `J_Bip_${side}_Thumb3`)!
      const tip = new Vector3(side === 'L' ? 0.015 : -0.015, 0, 0)
      const position = () =>
        Vector3.TransformCoordinates(
          Vector3.TransformCoordinates(tip, thumb.computeWorldMatrix(true)),
          Matrix.Invert(hand.computeWorldMatrix(true)),
        )
      return {position, resting: position(), side}
    })
    const arms = createSeatedArms(container)
    const action = {gesture: 0, glance: 0, hands: 0, shift: 0}
    for (const side of ['L', 'R']) {
      const mesh = container.meshes.find(
        (item) => item.skeleton !== null && item.name.startsWith('Body'),
      )!
      const bone = mesh.skeleton!.bones.find((item) => item.name === `J_Bip_${side}_Index3`)!
      const indices = mesh.getVerticesData(VertexBuffer.MatricesIndicesKind)!
      const weights = mesh.getVerticesData(VertexBuffer.MatricesWeightsKind)!
      const influence = Array.from(indices).findIndex(
        (index, slot) => index === bone.getIndex() && weights[slot] > 0.5,
      )
      expect(influence).toBeGreaterThanOrEqual(0)
      const vertex = Math.floor(influence / 4)
      const points: Vector3[] = []
      for (let sample = 0; sample < 20; sample += 1) {
        arms.update(action, sample / 2)
        const thumb = thumbs.find((item) => item.side === side)!
        expect(thumb.position().y).toBeLessThan(thumb.resting.y - 0.001)
        mesh.skeleton!.prepare(true)
        points.push(Vector3.FromArray(mesh.getPositionData(true, true)!, vertex * 3))
      }
      const displacement = Math.max(...points.map((point) => Vector3.Distance(point, points[0])))
      expect(displacement).toBeGreaterThan(0.005)
      expect(displacement).toBeLessThan(0.1)
      console.info(filename, side, 'finger skin displacement (m)', displacement)
    }
    arms.dispose()
    container.dispose()
    scene.dispose()
    engine.dispose()
  },
  30000,
)
