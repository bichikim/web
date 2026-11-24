# Model cache

`cacheDirectory(identifier)` resolves an OS cache namespace independently of the project directory. macOS uses `~/Library/Caches`, Windows uses `LOCALAPPDATA`, and Linux uses an absolute `XDG_CACHE_HOME` or `~/.cache`.

`prepareModelAsset(directory, file, url, previous?)` reuses a file only after its exact size and SHA-256 match. Missing or invalid files are downloaded to a unique temporary file and published after validation. Concurrent calls in the same process share preparation; failures can be retried. Optional previous directories are migration sources and verified source files are moved out after publishing.

Consumers keep pinned model manifests beside their feature. Model binaries belong in this cache, never in Git. Packaging a verified cache file inside an application is a separate consumer decision.
