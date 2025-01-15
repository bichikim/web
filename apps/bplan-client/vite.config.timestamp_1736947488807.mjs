// vite.config.mts
import { defineConfig } from "@solidjs/start/config";
import { fileURLToPath, URL } from "node:url";
import * as path from "node:path";
import { generateSW } from "@winter-love/sw";
import unoCss from "unocss/vite";
import * as nodeFs from "node:fs";
import legacy from "@vitejs/plugin-legacy";
import { targets } from "@winter-love/vite-lib-config";
var fixNitroFunction = async () => {
  const source = process.env.VERCEL === "1" ? path.resolve(".vercel/output/functions/__nitro.func/chunks/nitro/nitro.mjs") : path.resolve(".output/server/chunks/nitro/nitro.mjs");
  const scriptJs = await nodeFs.promises.readFile(source, "utf8");
  await nodeFs.promises.writeFile(
    source,
    scriptJs.replace(
      `
function getDefaultExportFromNamespaceIfNotNamed (n) {
	return n && Object.prototype.hasOwnProperty.call(n, 'default') && Object.keys(n).length === 1 ? n['default'] : n;
}`,
      `
// hot fixed
function getDefaultExportFromNamespaceIfNotNamed (n) {
	return n && Object.prototype.hasOwnProperty.call(n, 'default') && (Object.keys(n).length === 1 || (Object.prototype.hasOwnProperty.call(n, '__esModule') && Object.keys(n).length === 2) ) ? n['default'] : n;
}`
    ),
    "utf8"
  );
};
var fixSw = async () => {
  return nodeFs.promises.rm(path.resolve("public/sw.js"));
};
var hotfix = async () => {
  await fixNitroFunction();
  await fixSw();
};
var createGenerateSwPlugin = () => {
  let _config;
  return {
    async closeBundle() {
      if (!_config) {
        return;
      }
      const { outDir, root } = _config.router;
      const swOutPath = path.join(root, "public/sw.js");
      await generateSW(swOutPath, {
        assets: "_build/assets/**/*",
        assetsRoot: outDir,
        cwd: ""
      });
    },
    configResolved(config) {
      if (config.router.type === "client" && config.mode === "production") {
        _config = config;
      }
    },
    name: "generate-sw"
  };
};
var vite_config_default = defineConfig({
  server: {
    hooks: {
      close: () => {
        return hotfix();
      }
    }
  },
  vite: {
    // build: {
    //   minify: false,
    // },
    plugins: [
      //
      unoCss("../../uno.config.ts"),
      createGenerateSwPlugin(),
      legacy({
        targets
      })
    ],
    resolve: {
      alias: {
        // fix #start/app is app.tsx only @solid/state error
        "#start/app": fileURLToPath(new URL("src/App.tsx", import.meta.url)),
        // fix @tonejs/midi is not module js
        "@tonejs/midi": fileURLToPath(
          new URL("node_modules/@tonejs/midi/src/Midi.ts", import.meta.url)
        ),
        src: fileURLToPath(new URL("src", import.meta.url))
      }
    }
  }
});
export {
  vite_config_default as default
};
