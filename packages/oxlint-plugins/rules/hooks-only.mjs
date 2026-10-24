import {dirname, isAbsolute, relative, resolve, sep} from 'node:path'
import {analyzeTopic, isSupportFile} from './hooks-only/analysis.mjs'

const findRoot = (filename, roots) => {
  let directory = dirname(filename)
  while (directory !== dirname(directory)) {
    const candidate = directory
    if (
      roots.some((root) =>
        isAbsolute(root)
          ? candidate === resolve(root)
          : candidate
              .replaceAll('\\', '/')
              .endsWith(`/${root.replaceAll('\\', '/').replace(/\/$/u, '')}`),
      )
    ) {
      return directory
    }
    directory = dirname(directory)
  }
  return null
}

/** @type {import('eslint').Rule.RuleModule} */
export const hooksOnly = {
  meta: {
    type: 'problem',
    docs: {description: 'require cohesive hook topics and allow only context-provider components'},
    schema: [{type: 'array', items: {type: 'string', minLength: 1}, uniqueItems: true}],
    messages: {
      topic: 'topic: Place hook code in a topic subdirectory of hooks.',
      missingHook:
        'missingHook: This topic must contain a function that uses Solid reactive APIs or composes a local hook.',
      component:
        'component: Only components returning a proven Context.Provider without UI markup are allowed in hooks.',
      unrelated:
        'unrelated: This runtime declaration is not used by a hook or its context provider in this topic.',
      analysis: 'analysis: Cannot inspect this hook topic: {{detail}}',
    },
  },
  create(context) {
    const filename = resolve(context.filename)
    const root = findRoot(filename, context.options[0] ?? [])
    if (root === null || isSupportFile(filename)) {
      return {}
    }
    return {
      Program(node) {
        const parts = relative(root, filename).split(sep)
        if (parts.length < 2) {
          context.report({node, messageId: 'topic'})
          return
        }
        let result
        try {
          result = analyzeTopic(root, resolve(root, parts[0]), filename, context.sourceCode.text)
        } catch (error) {
          context.report({node, messageId: 'analysis', data: {detail: String(error)}})
          return
        }
        if (!result.hasHook) {
          context.report({node, messageId: 'missingHook'})
        }
        result.problems.forEach(({reason, line, column}) =>
          context.report({
            loc: {start: {line, column}, end: {line, column: column + 1}},
            messageId: reason,
          }),
        )
      },
    }
  },
}
