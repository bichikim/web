import {existsSync} from 'node:fs'
import {dirname, join, resolve} from 'node:path'
import ts from '@typescript/typescript6'

const configHost = {
  ...ts.sys,
  readDirectory: () => [],
  onUnRecoverableConfigFileDiagnostic: () => {
    // An unreadable config cannot establish a bundler resolution contract.
  },
}

/** Reads the project's resolution contract without enumerating its source files. */
function readOptions(filename) {
  const config = ts.findConfigFile(dirname(filename), ts.sys.fileExists)
  if (!config) {
    return null
  }
  return ts.getParsedCommandLineOfConfigFile(config, {}, configHost)?.options ?? null
}

/** @type {import('eslint').Rule.RuleModule} */
export const noUselessIndex = {
  meta: {
    type: 'suggestion',
    docs: {description: 'omit relative index imports that resolve identically in bundler projects'},
    schema: [],
    messages: {redundant: 'Omit the final index filename: use "{{specifier}}".'},
  },
  create(context) {
    const filename = context.filename
    // Native Node ESM and config/script files have different resolution contracts.
    if (!/\.[jt]sx?$/u.test(filename)) {
      return {}
    }
    let options
    function check(source) {
      const specifier = source?.value
      if (
        typeof specifier !== 'string' ||
        !/^\.{1,2}\//u.test(specifier) ||
        !/\/index(?:\.[jt]sx?)?$/u.test(specifier) ||
        /[?#\\]/u.test(specifier)
      ) {
        return
      }
      options ??= readOptions(filename)
      if (options?.moduleResolution !== ts.ModuleResolutionKind.Bundler) {
        return
      }
      const shortened = specifier.replace(/\/index(?:\.[jt]sx?)?$/u, '') || '.'
      const original = ts.resolveModuleName(specifier, filename, options, ts.sys).resolvedModule
      const candidate = ts.resolveModuleName(shortened, filename, options, ts.sys).resolvedModule
      const directory = resolve(dirname(filename), shortened)
      // TypeScript and runtime bundlers can prefer different extensions or package entries.
      const extensions = [
        '.mjs',
        '.js',
        '.mts',
        '.ts',
        '.jsx',
        '.tsx',
        '.json',
        '.cjs',
        '.cts',
        '.node',
      ]
      const conflict =
        existsSync(join(directory, 'package.json')) ||
        extensions.some(
          (extension) =>
            existsSync(`${directory}${extension}`) ||
            (join(directory, `index${extension}`) !== original?.resolvedFileName &&
              existsSync(join(directory, `index${extension}`))),
        )
      if (
        original &&
        candidate &&
        !conflict &&
        dirname(original.resolvedFileName) === directory &&
        original.resolvedFileName === candidate.resolvedFileName
      ) {
        context.report({node: source, messageId: 'redundant', data: {specifier: shortened}})
      }
    }
    return {
      ImportDeclaration: (node) => check(node.source),
      ExportNamedDeclaration: (node) => check(node.source),
      ExportAllDeclaration: (node) => check(node.source),
      ImportExpression: (node) => check(node.source),
    }
  },
}
