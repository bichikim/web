import {getComputationType} from 'src/compute'
import {State} from 'src/state'
import {AllKinds, getIdentifier, getName, getRelates} from 'src/info'

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

export const genInspectorTree = (states: Record<string, State<any>>) => {
  const relationMap = new Map<string, AllKinds>()
  // eslint-disable-next-line max-statements
  const nodes = Object.keys(states).map((key) => {
    const state = states[key]
    const children: any[] = []
    const type = getIdentifier(state) ?? 'unknown'

    const relates = getRelates(state)

    if (relates) {
      for (const item of relates) {
        const type = getIdentifier(item) ?? 'unknown'

        const name = getName(item)

        const id = `${key}/mutation/${name}`

        relationMap.set(id, item)

        const relate = getRelates(item)
        const isMultiRelation = relate && relate.size > 1

        const tags = [
          {
            backgroundColor: textBackgroundColors[type],
            label: type,
            textColor: 0x000000,
          },
        ]

        if (isMultiRelation) {
          tags.push({
            backgroundColor: textBackgroundColors.multi,
            label: 'multi',
            textColor: 0x000000,
          })
        }

        if (type === 'computation') {
          const computeType = getComputationType(item)
          if (computeType === 'getter') {
            tags.push({
              backgroundColor: textBackgroundColors.tip,
              label: 'get',
              textColor: 0x000000,
            })
          }

          if (computeType === 'getter & setter') {
            tags.push(
              {
                backgroundColor: textBackgroundColors.tip,
                label: 'get',
                textColor: 0x000000,
              },
              {
                backgroundColor: textBackgroundColors.tip,
                label: 'set',
                textColor: 0x000000,
              },
            )
          }
        }

        children.push({
          id,
          label: name,
          tags,
        })
      }
    }

    return {
      children,
      id: key,
      label: key,
      tags: [{
        backgroundColor: textBackgroundColors[type],
        label: type,
        textColor: 0x000000,
      }],
    }
  })

  return {
    nodes,
    relationMap,
  }
}
