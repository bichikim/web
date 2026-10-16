import {createMemo} from 'solid-js'
import type {PuppetParameterValues} from '../../deformation'
import type {PuppetParameterBinding3D} from '../../player/document'
import {EditorKeyformFlatTrack} from './EditorKeyformFlatTrack'
import {
  type EditorKeyformTrackProps,
  getKeyformVolumeViews,
  getNearestPlaneValue,
  getSlicePoint,
} from './keyform-track'

export interface EditorKeyformVolumeTrackProps extends EditorKeyformTrackProps {
  readonly binding: PuppetParameterBinding3D
}

const inPlane = (point: PuppetParameterValues, z: number): PuppetParameterValues => [
  point[0],
  point[1] ?? 0,
  z,
]

/**
 * A 3D binding as the first/second value grid at the plane nearest the third value, above a
 * track of the planes. Grid edits act on that point in every plane; track edits on a plane.
 */
export const EditorKeyformVolumeTrack = (props: EditorKeyformVolumeTrackProps) => {
  const views = createMemo(() => getKeyformVolumeViews(props.binding))
  const values = (): readonly [number, number, number] => [
    props.values?.[0] ?? props.parameters[0]?.defaultValue ?? 0,
    props.values?.[1] ?? props.parameters[1]?.defaultValue ?? 0,
    props.values?.[2] ?? props.parameters[2]?.defaultValue ?? 0,
  ]
  const plane = () => getNearestPlaneValue(views().planes, values()[2])
  const active = () => props.activeKeyformValues ?? null
  /** The active point, or the slice's first point, at third value `z`. */
  const atPlane = (z: number) => inPlane(getSlicePoint(views().slice, active() ?? values()), z)
  const handleDepthAdd = () => {
    // Land on an existing point so adding the plane adds no point column.
    props.onValueChange?.(atPlane(values()[2]))
    props.onKeyformAdd?.()
  }
  const handleDepthDelete = () => props.onKeyformPlaneDelete?.(props.binding.id, values()[2])

  return (
    <div class="keyform-volume-track">
      <EditorKeyformFlatTrack
        {...props}
        activeKeyformValues={active()?.[2] === plane() ? [active()![0], active()![1] ?? 0] : null}
        binding={views().slice}
        parameters={props.parameters.slice(0, 2)}
        values={[values()[0], values()[1]]}
        onKeyformMove={
          props.onKeyformMove &&
          ((bindingId, from, to) =>
            props.onKeyformMove?.(bindingId, inPlane(from, plane()), inPlane(to, plane())))
        }
        onKeyformSelect={
          props.onKeyformSelect &&
          ((bindingId, point) => props.onKeyformSelect?.(bindingId, inPlane(point, plane())))
        }
        onValueChange={
          props.onValueChange && ((point) => props.onValueChange?.(inPlane(point, values()[2])))
        }
      />
      <EditorKeyformFlatTrack
        {...props}
        activeKeyformValues={active() === null ? null : [active()![2] ?? 0]}
        binding={views().depth}
        parameters={props.parameters.slice(2)}
        values={[values()[2]]}
        onKeyformAdd={props.onKeyformAdd && handleDepthAdd}
        onKeyformDelete={props.onKeyformPlaneDelete && handleDepthDelete}
        onKeyformMove={
          props.onKeyformMove &&
          ((bindingId, [from = 0], [to = 0]) =>
            props.onKeyformMove?.(bindingId, atPlane(from), atPlane(to)))
        }
        onKeyformSelect={
          props.onKeyformSelect &&
          ((bindingId, [z = 0]) => props.onKeyformSelect?.(bindingId, atPlane(z)))
        }
        onValueChange={
          props.onValueChange && (([z = 0]) => props.onValueChange?.([values()[0], values()[1], z]))
        }
      />
    </div>
  )
}
