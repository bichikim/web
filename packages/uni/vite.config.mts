import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import solidPlugin from "vite-plugin-solid";

import pkg from "./package.json";

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
      entry: path.resolve(__dirname, "src/index.ts"),
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: [
        ...Object.keys(pkg.dependencies),
        ...Object.keys(pkg.peerDependencies),
      ],
    },
  },
});