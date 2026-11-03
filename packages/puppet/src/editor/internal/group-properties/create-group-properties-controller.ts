import {getGroupRenderProperties} from '../../../deformation'
import {
  PUPPET_DEFAULT_DRAW_ORDER,
  type PuppetDocument,
  type PuppetGroupRenderProperties,
} from '../../../player'
import {hexToColor} from '../color-hex'
import {
  connectParameterGroup,
  disconnectParameterGroup,
  getKeyformGroupProperties,
  isGroupConnected,
  setKeyformGroupProperties,
} from '../group-keyforms'
import {setDrawOrderGroup, setGroupRenderProperties} from '../group-properties'
import type {GroupPropertiesProps} from './types'

/** Reads and writes the group's rest properties, or its keyed ones in the selected keyform. */
export const createGroupPropertiesController = (props: GroupPropertiesProps) => {
  const disabled = () => props.disabled === true || props.onDocumentChange === undefined
  const commit = (document: PuppetDocument | undefined) => {
    if (document !== undefined && !disabled()) {
      props.onDocumentChange?.(document)
    }
  }
  const keyed = () => isGroupConnected(props.document, props.keyform?.bindingId, props.group.id)
  const keyedProperties = () =>
    props.keyform === undefined
      ? undefined
      : getKeyformGroupProperties(
          props.document,
          props.keyform.bindingId,
          props.keyform.values,
          props.group.id,
        )
  // Opacity and colors show and edit the selected keyform once the group is keyed.
  const properties = () => ({...getGroupRenderProperties(props.group), ...keyedProperties()})
  const apply = (changes: PuppetGroupRenderProperties) =>
    commit(setGroupRenderProperties(props.document, props.group.id, changes))
  const applyEffect = (
    changes: Pick<
      PuppetGroupRenderProperties,
      'drawOrder' | 'multiplyColor' | 'opacity' | 'screenColor'
    >,
  ) =>
    props.keyform !== undefined && keyed()
      ? commit(
          setKeyformGroupProperties({
            ...props.keyform,
            document: props.document,
            groupId: props.group.id,
            properties: changes,
          }),
        )
      : apply(changes)
  const applyColor = (property: 'multiplyColor' | 'screenColor', value: string) => {
    const color = hexToColor(value)
    if (color !== undefined) {
      applyEffect({[property]: color})
    }
  }
  const setKeyed = (connect: boolean) => {
    const bindingId = props.keyform?.bindingId
    if (bindingId !== undefined) {
      commit(
        (connect ? connectParameterGroup : disconnectParameterGroup)(
          props.document,
          bindingId,
          props.group.id,
        ),
      )
    }
  }

  const toggleDrawOrderGroup = (enabled: boolean) =>
    commit(setDrawOrderGroup(props.document, props.group.id, enabled))
  // The keyed draw order in the selected keyform, else the group's own.
  const drawOrder = () =>
    keyedProperties()?.drawOrder ?? props.group.properties?.drawOrder ?? PUPPET_DEFAULT_DRAW_ORDER
  return {
    apply,
    applyColor,
    applyEffect,
    disabled,
    drawOrder,
    keyed,
    properties,
    setKeyed,
    toggleDrawOrderGroup,
  }
}
