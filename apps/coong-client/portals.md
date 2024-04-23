# portals

./android/app/java/io.coong.app/MainActivity

```java
package io.coong.app;

import com.capacitorjs.portals.CapacitorPortalsBridgeActivity;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends CapacitorPortalsBridgeActivity  {}
```

./capacitor.config.ts

```ts
import {CapacitorConfig} from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'io.coong.app',
  appName: 'Coong',
  bundledWebRuntime: false,
  cordova: {},
  plugins: {
    Badge: {
      autoClear: false,
      persist: true,
    },
    Portals: {
      apps: [],
      shell: {
        name: 'shell',
        // portal first main source (in fact it's same if you want it)
        webDir: './dist/spa',
      },
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      androidScaleType: 'CENTER_CROP',
      backgroundColor: '#000000ff',
      launchAutoHide: true,
    },
  },
  // capacitor main source
  webDir: 'dist/spa',
}

export default config

```

주의 https host 되고 있으면 제거 

read more https://ionic.io/docs/portals/for-capacitor/overview

