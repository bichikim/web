import {getComputationType} from 'src/compute'
import {State} from 'src/state'
import {AllKinds, getIdentifier, getName, getRelates} from 'src/info'

const textBackgroundColors = {
  unknown: 0xFF0000,
  mutation: 0xFF984F,
  action: 0x73abfe,
  computation: 0x42b983,
  state: 0x42b983,
  tip: 0xf8f8f8,
  multi: 0xFFC66D,
}

export const genInspectorTree = (states: Record<string, State<any>>) => {
  const relationMap = new Map<string, AllKinds>()
  const nodes = Object.keys(states).map((key) => {
    const state = states[key]
    const children: any[] = []

    const relates = getRelates(state)

    if (relates) {
      relates.forEach((item) => {
        const type = getIdentifier(item) ?? 'unknown'

        const name = getName(item)

        const id = `${key}/mutation/${name}`

        relationMap.set(id, item)

        const relate = getRelates(item)
        const isMultiRelation = relate && relate.size > 1

        const tags = [
          {
            label: type,
            textColor: 0x000000,
            backgroundColor: textBackgroundColors[type],
          },
        ]

        if (isMultiRelation) {
          tags.push({
            label: 'multi',
            textColor: 0x000000,
            backgroundColor: textBackgroundColors.multi,
          })
        }

        if (type === 'computation') {
          const computeType = getComputationType(item)
          if (computeType === 'getter') {
            tags.push({
              label: 'get',
              textColor: 0x000000,
              backgroundColor: textBackgroundColors.tip,
            })
          }

          if (computeType === 'getter & setter') {
            tags.push(
              {
                label: 'get',
                textColor: 0x000000,
                backgroundColor: textBackgroundColors.tip,
              },
              {
                label: 'set',
                textColor: 0x000000,
                backgroundColor: textBackgroundColors.tip,
              },
            )
          }
        }

        children.push({
          id,
          label: name,
          tags,
        })
      })
    }

    return {
      id: key,
      label: key,
      tags: [{
        label: 'state',
        textColor: 0x000000,
        backgroundColor: textBackgroundColors.state,
      }],
      children,
    }
  })

  return {
    relationMap,
    nodes,
  }
}
