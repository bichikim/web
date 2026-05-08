'use strict'

const compareNaturally = (first, second) =>
  first.localeCompare(second, undefined, {numeric: true, sensitivity: 'variant'})

const getStaticPropertyName = (node) => {
  if (!node || node.type !== 'Property') {
    return null
  }

  const {key} = node

  if (key.type === 'Identifier') {
    return key.name
  }

  if (key.type === 'Literal') {
    return String(key.value)
  }

  if (key.type === 'TemplateLiteral' && key.expressions.length === 0) {
    return key.quasis[0]?.value?.cooked ?? null
  }

  return null
}

const isInOrder = ({caseSensitive, currentName, natural, order, prevName}) => {
  const left = caseSensitive ? prevName : prevName.toLowerCase()
  const right = caseSensitive ? currentName : currentName.toLowerCase()
  const compareResult = natural ? compareNaturally(left, right) : left.localeCompare(right)

  return order === 'desc' ? compareResult >= 0 : compareResult <= 0
}

module.exports = {
  rules: {
    'sort-keys-fix': {
      create(context) {
        const order = context.options[0] ?? 'asc'
        const optionObject = context.options[1] ?? {}
        const caseSensitive = optionObject.caseSensitive !== false
        const natural = Boolean(optionObject.natural)
        const objectStack = []
        const {sourceCode} = context

        const resetOnSpread = (node) => {
          if (node.parent?.type === 'ObjectExpression' && objectStack.length > 0) {
            objectStack[objectStack.length - 1].prevName = null
            objectStack[objectStack.length - 1].prevNode = null
          }
        }

        /* eslint-disable @typescript-eslint/naming-convention -- ESLint visitor keys match AST node types */
        return {
          ObjectExpression() {
            objectStack.push({prevName: null, prevNode: null})
          },
          'ObjectExpression:exit'() {
            objectStack.pop()
          },
          Property(node) {
            if (node.parent?.type === 'ObjectPattern' || node.parent?.type !== 'ObjectExpression') {
              return
            }

            const currentState = objectStack[objectStack.length - 1]
            if (!currentState) {
              return
            }

            const currentName = getStaticPropertyName(node)
            const {prevName} = currentState
            const {prevNode} = currentState

            if (currentName !== null) {
              currentState.prevName = currentName
              currentState.prevNode = node
            }

            if (prevName === null || currentName === null || !prevNode) {
              return
            }

            if (
              isInOrder({
                caseSensitive,
                currentName,
                natural,
                order,
                prevName,
              })
            ) {
              return
            }

            context.report({
              data: {
                caseText: caseSensitive ? '' : 'insensitive ',
                currentName,
                naturalText: natural ? 'natural ' : '',
                order,
                prevName,
              },
              fix(fixer) {
                const currentText = sourceCode.getText(node)
                const previousText = sourceCode.getText(prevNode)

                return [
                  fixer.replaceText(prevNode, currentText),
                  fixer.replaceText(node, previousText),
                ]
              },
              loc: node.key.loc,
              message:
                'Expected object keys to be in {{naturalText}}{{caseText}}{{order}}ending order. ' +
                "'{{currentName}}' should be before '{{prevName}}'.",
              node,
            })
          },
          SpreadElement: resetOnSpread,
        }
        /* eslint-enable @typescript-eslint/naming-convention */
      },
      meta: {
        docs: {
          description: 'require object keys to be sorted with autofix',
          recommended: false,
        },
        fixable: 'code',
        schema: [
          {
            enum: ['asc', 'desc'],
          },
          {
            additionalProperties: false,
            properties: {
              caseSensitive: {type: 'boolean'},
              natural: {type: 'boolean'},
            },
            type: 'object',
          },
        ],
        type: 'suggestion',
      },
    },
  },
}
