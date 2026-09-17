import {posix} from 'node:path'

const isHookName = (name) => typeof name === 'string' && /^use[A-Z0-9]/u.test(name)
const isSolidSource = (source) => source === 'solid-js' || source.startsWith('solid-js/')
const isHookSource = (source) => isSolidSource(source) || /(?:^|\/)hooks(?:\/|$)/u.test(source)
const getName = (node) => node?.name ?? node?.value
const isTypeOnly = (node) => node.importKind === 'type' || node.exportKind === 'type'

const matchesDirectory = (filename, patterns) => {
  const normalized = filename.replaceAll('\\', '/')
  return patterns.some((pattern) => {
    const glob = pattern.replaceAll('\\', '/')
    return normalized
      .split('/')
      .some((_, index, segments) => posix.matchesGlob(segments.slice(index).join('/'), glob))
  })
}

/** @type {import('eslint').Rule.RuleModule} */
export const forbiddenHooks = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'forbid hook definitions, calls, and reactive runtime imports in selected directories',
    },
    schema: [{type: 'array', items: {type: 'string', minLength: 1}, uniqueItems: true}],
    messages: {
      forbidden:
        'Hooks and reactive runtime APIs are forbidden in this directory. Move this code to hooks or its feature.',
    },
  },
  create(context) {
    if (!matchesDirectory(context.filename, context.options[0] ?? [])) {
      return {}
    }
    const report = (node) => context.report({node, messageId: 'forbidden'})
    const checkImport = (node) => {
      if (isTypeOnly(node)) {
        return
      }
      const source = node.source.value
      const runtime = node.specifiers.filter((specifier) => !isTypeOnly(specifier))
      if (runtime.length === 0 && node.specifiers.length > 0) {
        return
      }
      if (isHookSource(source)) {
        report(node)
        return
      }
      runtime.forEach((specifier) => {
        const imported = getName(specifier.imported ?? specifier.local)
        if (isHookName(imported) || (source === 'react' && imported === 'use')) {
          report(specifier)
        }
      })
    }
    const checkExport = (node) => {
      if (node.source === null || isTypeOnly(node)) {
        return
      }
      const runtime = node.specifiers?.filter((specifier) => !isTypeOnly(specifier))
      if (runtime?.length === 0 && node.specifiers.length > 0) {
        return
      }
      if (isHookSource(node.source.value)) {
        report(node)
        return
      }
      runtime?.forEach((specifier) => {
        if (isHookName(getName(specifier.local))) {
          report(specifier)
        }
      })
    }
    // Visitor names are defined by the ESLint AST contract.
    return {
      ImportDeclaration: checkImport,
      ExportNamedDeclaration: checkExport,
      ExportAllDeclaration: checkExport,
      ImportExpression(node) {
        if (typeof node.source.value === 'string' && isHookSource(node.source.value)) {
          report(node)
        }
      },
      FunctionDeclaration(node) {
        if (isHookName(node.id?.name)) {
          report(node.id)
        }
      },
      VariableDeclarator(node) {
        if (isHookName(node.id.name)) {
          report(node.id)
        }
      },
      CallExpression(node) {
        const {callee} = node
        const name = callee.type === 'Identifier' ? callee.name : getName(callee.property)
        if (isHookName(name)) {
          report(node)
        }
        if (callee.type === 'Identifier' && callee.name === 'require') {
          const source = node.arguments[0]?.value
          if (typeof source === 'string' && isHookSource(source)) {
            report(node)
          }
        }
      },
    }
  },
}
