import {useInfo} from 'src/info'
import {CustomInspectorNode} from '@vue/devtools-api'
import {stateName} from 'src/state'
import {mutationName} from 'src/mutate'
import {computeName, computeRefName} from 'src/compute'

const textBackgroundColors = {
  action: 0x73_AB_FE,
  atom: 0xC0_4A_C2,
  [computeName]: 0x42_B9_83,
  [computeRefName]: 0x42_B9_83,
  multi: 0xFF_C6_6D,
  [mutationName]: 0xFF_98_4F,
  [stateName]: 0x42_B9_83,
  tip: 0xF8_F8_F8,
  unknown: 0xFF_00_00,
}

export const createInspectorTree = (targets: Record<string, any>) => {
  const info = useInfo()
  const relationMap = new Map<string, any>()

  const nodes: CustomInspectorNode[] = Object.keys(targets).map((name: string) => {
    const target = targets[name]
    const children: any[] = []
    const targetInfo = info.get(target)

    const kind = targetInfo?.kind ?? 'unknown'
    return {
      id: name,
      label: name,
      tags: [{
        backgroundColor: textBackgroundColors[kind],
        label: kind,
        textColor: 0x00_00_00,
      }],
    }
  })

  return {
    nodes,
  }
}
