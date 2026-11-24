# Display refresh

The default launch retains WebKit's frame cadence. On macOS, `--high-refresh-rate` opts into the display cadence:

```sh
apps/wallpaper/src-tauri/target/debug/bundle/macos/Wallpaper.app/Contents/MacOS/wallpaper-desktop --high-refresh-rate
```

[refresh_rate.rs](./refresh_rate.rs) applies this at navigation start. It checks WebKit's private feature API and disables `PreferPageRenderingUpdatesNear60FPSEnabled` only when that feature is available. Unsupported WebKit versions retain their defaults. The feature API is declared in [WebKit's private preferences header](https://github.com/WebKit/WebKit/blob/main/Source/WebKit/UIProcess/API/Cocoa/WKPreferencesPrivate.h).

The option permits a higher requestAnimationFrame cadence; the display and WebKit still choose the delivered rate. Measure UI callbacks and completed character submissions separately: requesting more callbacks can lower character throughput.
