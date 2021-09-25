import {CapacitorConfig} from '@capacitor/cli'

console.log('foo')

const config: CapacitorConfig = {
  appId: 'io.coong.app',
  appName: 'coong',
  bundledWebRuntime: false,
  server: {
    cleartext: true,
    url: 'http://192.168.35.123:3000',
  },
  webDir: 'dist/spa',
}

export default config
