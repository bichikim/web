import type {ParameterGroup} from '../../tracking/types'
import {useMappingGraph} from './context'
import {EditableCardName} from './EditableCardName'
interface GroupNameProps {
  readonly group: ParameterGroup
}
export const GroupName = (props: GroupNameProps) => {
  const graph = useMappingGraph()
  const rename = (name: string) => {
    const profile = graph.controls.profile()
    if (profile !== undefined) {
      graph.controls.updateProfile({
        ...profile,
        groups: profile.groups?.map((group) =>
          group.id === props.group.id ? {...group, name} : group,
        ),
      })
    }
  }
  return <EditableCardName name={props.group.name} label="그룹 이름" onRename={rename} />
}
