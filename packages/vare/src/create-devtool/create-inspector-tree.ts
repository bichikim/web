import {getGlobalInfo, getIdentifier} from 'src/info'
import {CustomInspectorNode} from '@vue/devtools-api'

const textBackgroundColors = {
  action: 0x73ABFE,
  atom: 0xC04AC2,
  computation: 0x42B983,
  multi: 0xFFC66D,
  mutation: 0xFF984F,
  state: 0x42B983,
  tip: 0xF8F8F8,
  unknown: 0xFF0000,
}

export const createInspectorTree = (targets: Record<string, any>) => {
  const info = getGlobalInfo()
  const relationMap = new Map<string, any>()

  const nodes: CustomInspectorNode[] = Object.keys(targets).map((name: string) => {
    const target = targets[name]
    const children: any[] = []

    const type = getIdentifier(info, target) ?? 'unknown'
    return {
      id: name,
      label: name,
      tags: [{
        backgroundColor: textBackgroundColors[type],
        label: type,
        textColor: 0x000000,
      }],
    }
  })

  return {
    nodes,
  }
}
