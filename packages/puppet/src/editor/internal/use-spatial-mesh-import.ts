import {type Accessor, onCleanup} from 'solid-js'
import {createSpatialMeshObject} from '../../deformation/create-spatial-mesh-object'
import {importSpatialMesh} from '../../deformation/import-spatial-mesh'
import type {PuppetSpatialMeshObject} from '../../player'

interface UseSpatialMeshImportProps {
  readonly bounds: Accessor<{x: number; y: number; width: number; height: number}>
  readonly onError: (message: string | undefined) => void
  readonly onImport: (object: PuppetSpatialMeshObject) => void
}

const MAX_FILE_BYTES = 20_000_000

export const useSpatialMeshImport = (props: UseSpatialMeshImportProps) => {
  let generation = 0
  const resetImport = () => {
    generation += 1
  }
  onCleanup(resetImport)
  const importFile = async (file: File | undefined) => {
    if (file === undefined) {
      return
    }
    const activeGeneration = generation
    const bounds = props.bounds()
    try {
      if (file.size > MAX_FILE_BYTES) {
        throw new Error('20MB 이하의 GLB 파일을 선택해 주세요.')
      }
      const buffer = await file.arrayBuffer()
      if (activeGeneration !== generation) {
        return
      }
      props.onImport(createSpatialMeshObject(importSpatialMesh(buffer, file.name, bounds)))
      props.onError(undefined)
    } catch (error) {
      if (activeGeneration !== generation) {
        return
      }
      props.onError(error instanceof Error ? error.message : 'GLB 메시를 가져올 수 없습니다.')
    }
  }
  return {importFile, resetImport}
}
