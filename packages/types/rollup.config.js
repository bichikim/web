import typescript from 'rollup-plugin-typescript2'
import minify from 'rollup-plugin-babel-minify'
import pkg from './package.json'

const getConfig = ({output, isMinify = false, format = 'esm'}) => {
  return {
    input: 'src/index.ts',
    output: {
      file: output,
      name: pkg.name,
      format,
      sourcemap: true,
      globals: {
        vue: 'Vue',
        '@emotion/cache': 'emotion__cache',
        '@emotion/serialize': 'emotion__serialize',
        '@emotion/utils': 'emotion__utils',
      },
    },
    external: ['vue', '@emotion/serialize', '@emotion/utils', '@emotion/cache'],
    plugins: [
      typescript({
        module: 'esnext',
      }),
      ...(isMinify ? [
        minify({
          comments: false,
        }),
      ] : []),
    ],
  }
}

export default [
  getConfig({output: 'lib/index.esm.js', isMinify: true}),
  getConfig({output: 'lib/index.min.js', isMinify: true, format: 'umd'}),
  getConfig({output: 'lib/index.js', isMinify: false}),
]
