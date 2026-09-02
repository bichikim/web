import {Show} from 'solid-js'

import type {UseAutoMeshResult} from '../use-auto-mesh'
import {AutoMeshDialog} from './AutoMeshDialog'

export interface EditorAutoMeshDialogProps {
  readonly autoMesh: UseAutoMeshResult
}

export const EditorAutoMeshDialog = (props: EditorAutoMeshDialogProps) => {
  const targets = () => props.autoMesh.targets()
  const maximumHeight = () => Math.max(1, ...targets().map((part) => part.texture.height))
  const maximumWidth = () => Math.max(1, ...targets().map((part) => part.texture.width))

  return (
    <Show when={props.autoMesh.isOpen()}>
      <AutoMeshDialog
        errorMessage={props.autoMesh.errorMessage() ?? undefined}
        isOpen
        onGenerate={props.autoMesh.generate}
        onOpenChange={props.autoMesh.onOpenChange}
        partName={targets().length === 1 ? targets()[0]?.id : `${targets().length}개 파트`}
        textureHeight={maximumHeight()}
        textureWidth={maximumWidth()}
      />
    </Show>
  )
}
