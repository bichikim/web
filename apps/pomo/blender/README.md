# Blender integration

1. Run `pnpm --filter @apps/pomo blender:open`.
2. Edit `character-studio.blend` and save it.
3. Needle Exporter writes `public/models/blender/scene.glb`; `/character` reloads it after a browser refresh.

For a headless export, run `pnpm --filter @apps/pomo blender:export`.

The Blender project is intentionally isolated from the SolidStart root so generated Needle metadata
does not participate in the app's server-side rendering pipeline.
