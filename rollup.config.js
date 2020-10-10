import typescript from 'rollup-plugin-typescript2'
import ttypescript from 'ttypescript'
import {terser} from 'rollup-plugin-terser'
import alias from '@rollup/plugin-alias'

export const getConfig = (options = {}) => {
  const {output, format = 'esm', name, external = [], minify = false} = options
  return {
    input: 'src/index.ts',
    output: {
      file: output,
      name,
      format,
      sourcemap: true,
      plugins: minify ? [terser()] : [],
      globals: {
        lodash: '_',
        vue: 'Vue',
        '@emotion/cache': 'emotion__cache',
        '@emotion/serialize': 'emotion__serialize',
        '@emotion/utils': 'emotion__utils',
        'styled-system': 'styled-system',
        '@styled-system/core': 'styled-system__core',
        '@styled-system/css': 'styled-system__css',
        '@styled-system/should-forward-prop': 'styled-system__should-forward-prop',
        '@innovirus/emotion': 'innovirus__emotion',
        popmotion: 'popmotion',
        interactjs: 'interactjs',
      },
    },
    external,
    plugins: [
      alias({
        entries: [
          {find: '@', replacement: 'src'},
        ],
      }),
      typescript({
        typescript: ttypescript,
        rollupCommonJSResolveHack: true,
        module: 'esnext',
        tsconfigDefaults: {
          compilerOptions: {
            plugins: [
              {transform: '@zerollup/ts-transform-paths'},
            ],
          },
        },
      }),
    ],
  }
}
