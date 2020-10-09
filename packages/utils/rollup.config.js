import typescript from 'rollup-plugin-typescript2'
import minify from 'rollup-plugin-babel-minify'

const getConfig = ({output, isMinify = false, format = 'esm'}) => {
  return {
    input: 'src/index.ts',
    output: {
      file: output,
      format,
      sourcemap: true,
    },
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
  getConfig({output: 'dist/index.esm.js', isMinify: true}),
  getConfig({output: 'dist/index.js', isMinify: true, format: 'umd'}),
]
