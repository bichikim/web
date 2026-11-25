# Isolated built-in frontend

The native WebKit custom scheme does not expose cross-origin isolation even with COOP/COEP
response headers. Production therefore serves embedded assets at `http://127.0.0.1:1431`;
development retains its existing Vite origin. The listener accepts only the owned Host/Origin,
read methods and bounded requests, keeps the embedded CSP, and closes with the app.

Changing the origin also changes IndexedDB ownership. A hidden original-origin window exports
the existing Wallpaper databases without declaring upgrades. The manager imports schema and
records in a dedicated Worker, verifies complete export hashes, and then releases other windows.
Existing conflicting target records reject the copy. Original databases and staged archives are
retained; the durable completion marker avoids another copy on subsequent launches. Native
settings files and authored models are unchanged. Keep the production port stable to retain the
destination origin.
