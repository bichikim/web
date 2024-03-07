import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import solidPlugin from "vite-plugin-solid";
import {fileURLToPath, URL} from 'node:url'

import pkg from "./package.json";

const external = [
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies),
]

const resolvePath = (url: string) => fileURLToPath(new URL(url, import.meta.url))

export default defineConfig({
  plugins: [
    solidPlugin(),
    dts({
      compilerOptions: {
        emitDeclarationOnly: true,
        declaration: true,
        declarationMap: true,
        declarationDir: 'dist'
      },
      insertTypesEntry: true,
      entryRoot: 'src'
    }),
  ],
  build: {
    lib: {
      entry: [
        resolvePath('src/index.ts'),
        resolvePath('src/test.ts'),
      ],
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external,
    },
  },
});