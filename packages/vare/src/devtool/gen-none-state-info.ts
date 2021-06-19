import {
  AllKinds, getDescription, getIdentifier, getName, getPlayground, getRelates,
} from 'src/info'
import {CustomInspectorState} from '@vue/devtools-api'

// eslint-disable-next-line max-lines-per-function,max-statements
export const genNoneStateInfo = (target: AllKinds): CustomInspectorState => {
  const relate = getRelates(target)
  const type = getIdentifier(target) ?? 'unknown'
  const raw = target?.toString() ?? 'empty'
  const description = getDescription(target)
  const name = getName(target) ?? 'unknwon'

  const result: CustomInspectorState = {
    info: [
      {
        editable: false,
        key: 'name',
        value: {
          _custom: {
            display: name,
          },
        },
      },
      {
        editable: false,
        key: 'type',
        value: {
          _custom: {
            display: type,
          },
        },
      },
    ],
  }

  if (type === 'computation') {
    const playground = getPlayground(target)
    const args = playground?.args
    let returnValue

    try {
      returnValue = target(args).value
    } catch {
      // skip
    }

    result.playground = [
      {
        editable: true,
        key: 'args',
        value: playground?.args,
      },
      {
        editable: false,
        key: 'return',
        value: returnValue,
      },
    ]
  }

  if (description) {
    result.info.push({
      editable: false,
      key: 'description',
      raw,
      value: {
        _custom: {
          display: description ?? 'none',
          tooltip: raw,
          type: 'function',
        },
      },
    })
  }

  if (relate && relate.size > 0) {
    result.relation = []

    for (const state of relate) {
      const name = getName(state) ?? 'unknown'
      result.relation.push({
        editable: false,
        key: name,
        value: {
          _custom: {
            display: 'state',
          },
        },
      })
    }
  }

  return result
}
