import {createMemo} from 'solid-js'
import type {PuppetParameterValues} from '../../deformation'
import type {PuppetParameterBinding3D} from '../../player/document'
import {EditorKeyformFlatTrack} from './EditorKeyformFlatTrack'
import {type EditorKeyformTrackProps, getKeyformVolumeViews} from './keyform-track'

export interface EditorKeyformVolumeTrackProps extends EditorKeyformTrackProps {
  readonly binding: PuppetParameterBinding3D
}

const inPlane = (point: PuppetParameterValues, z: number): PuppetParameterValues => [
  point[0],
  point[1] ?? 0,
  z,
]

/** 현재 Z의 XY 키폼을 육면체 단면에서 편집하고 아래 트랙으로 Z를 선택한다. */
export const EditorKeyformVolumeTrack = (props: EditorKeyformVolumeTrackProps) => {
  const values = (): readonly [number, number, number] => [
    props.values?.[0] ?? props.parameters[0]?.defaultValue ?? 0,
    props.values?.[1] ?? props.parameters[1]?.defaultValue ?? 0,
    props.values?.[2] ?? props.parameters[2]?.defaultValue ?? 0,
  ]
  const currentZ = createMemo(() => values()[2])
  const views = createMemo(() => getKeyformVolumeViews(props.binding, currentZ()))
  const active = () => props.activeKeyformValues ?? null
  const handlePointSelect = (bindingId: string, point: PuppetParameterValues) =>
    props.onKeyformSelect?.(bindingId, inPlane(point, values()[2]))
  const handlePointChange = (point: PuppetParameterValues) =>
    props.onValueChange?.(inPlane(point, values()[2]))
  const handlePointMove: NonNullable<EditorKeyformTrackProps['onKeyformMove']> = (
    bindingId,
    from,
    to,
  ) => props.onKeyformMove?.(bindingId, inPlane(from, values()[2]), inPlane(to, values()[2]))
  const handleDepthChange = ([value = 0]: PuppetParameterValues) => {
    const nextValues = inPlane(values(), value)
    if (!props.active) {
      props.onBindingSelect?.(props.binding.id)
    }
    props.onValueChange?.(nextValues)
  }
  const handleDepthSelect = (_bindingId: string, point: PuppetParameterValues) =>
    handleDepthChange(point)
  const handleDepthDelete = () => props.onKeyformPlaneDelete?.(props.binding.id, currentZ())
  const handleDepthMove: NonNullable<EditorKeyformTrackProps['onKeyformMove']> = (
    bindingId,
    [from],
    [to = 0],
  ) => {
    const candidates = props.binding.keyforms.filter((keyform) => keyform.values[2] === from)
    const [x, y] = values()
    const point = (
      candidates.find((keyform) => keyform.values[0] === x && keyform.values[1] === y) ??
      candidates[0]
    )?.values
    if (point !== undefined) {
      props.onKeyformMove?.(bindingId, point, inPlane(point, to))
    }
  }
  const volume = createMemo(() => {
    const parameter = props.parameters[2]
    return parameter === undefined
      ? undefined
      : {binding: props.binding, parameter, value: currentZ()}
  })
  return (
    <div class="keyform-volume-track">
      <EditorKeyformFlatTrack
        {...props}
        activeKeyformValues={
          active()?.[2] === values()[2] ? [active()![0], active()![1] ?? 0] : null
        }
        binding={views().slice}
        parameters={props.parameters.slice(0, 2)}
        values={[values()[0], values()[1]]}
        volume={volume()}
        onKeyformMove={props.onKeyformMove === undefined ? undefined : handlePointMove}
        onKeyformSelect={props.onKeyformSelect === undefined ? undefined : handlePointSelect}
        onValueChange={props.onValueChange === undefined ? undefined : handlePointChange}
      />
      <EditorKeyformFlatTrack
        {...props}
        activeKeyformValues={[currentZ()]}
        binding={views().depth}
        markerLabel="평면"
        parameters={props.parameters.slice(2)}
        values={[currentZ()]}
        onKeyformAdd={undefined}
        onKeyformDelete={props.onKeyformPlaneDelete === undefined ? undefined : handleDepthDelete}
        onKeyformMove={props.onKeyformMove === undefined ? undefined : handleDepthMove}
        onKeyformSelect={handleDepthSelect}
        onValueChange={props.onValueChange === undefined ? undefined : handleDepthChange}
      />
    </div>
  )
}
