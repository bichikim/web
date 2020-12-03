import {terser} from 'rollup-plugin-terser'
import alias from '@rollup/plugin-alias'
import esbuild from 'rollup-plugin-esbuild'
import path from 'path'

export const getConfig = (options = {}) => {
  const {output, format = 'esm', name, external = [], minify = false, projectRootDir} = options
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
          {find: '@', replacement: path.resolve(projectRootDir, 'src')},
          {find: 'src', replacement: path.resolve(projectRootDir, 'src')},
        ],
      }),
      esbuild({
        // All options are optional
        // include: /\.[jt]sx?$/, // default, inferred from `loaders` option
        // exclude: /node_modules/, // default
        sourceMap: false, // default
        minify,
        target: 'es2017', // default, or 'es20XX', 'esnext'
        jsxFactory: 'vueJsxCompat',
        // jsxFragment: 'React.Fragment',
        // Like @rollup/plugin-replace
        define: {
          __VERSION__: '"x.y.z"',
        },
        // Add extra loaders
        loaders: {
          // Add .json files support
          // require @rollup/plugin-commonjs
          '.json': 'json',
          // Enable JSX in .js files too
          '.js': 'jsx',
        },
      }),
    ],
  }
}
