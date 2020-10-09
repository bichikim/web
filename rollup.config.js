import typescript from 'rollup-plugin-typescript2'

export const getConfig = (options = {}) => {
  const {output, format = 'es', name} = options
  return {
    input: 'src/index.ts',
    output: {
      file: output,
      name,
      format,
      sourcemap: true,
      globals: {
        lodash: '_',
        vue: 'Vue',
        '@emotion/cache': 'emotion__cache',
        '@emotion/serialize': 'emotion__serialize',
        '@emotion/utils': 'emotion__utils',
      },
    },
    external: [
      'vue',
      'lodash',
      '@emotion/serialize',
      '@emotion/utils',
      '@emotion/cache',
    ],
    plugins: [
      typescript({
        rollupCommonJSResolveHack: true,
        module: 'esnext',
      }),
    ],
  }
}
