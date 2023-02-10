# Ionic

```shall
npm i -g @ionic/cli
```

set config for ionic with pnpm
```shall
ionic config set -g npmClient pnpm            
```

## coong-client/ionic.config.json

```json
{
  "name": "Coong",
  "integrations": {
    "capacitor": {}
  },
  "type": "vue",
  "id": "io.coong.app"
}
```

id unique domain base id if web site coong.io
the id is io.coong

## coong-client/capacitor.config.ts

```ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.coong.app',
  appName: 'Coong',
  webDir: 'dist',
  bundledWebRuntime: false
};

export default config;
```

## inspect webview
chrome://inspect/#devices
