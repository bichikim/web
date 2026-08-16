# Blender integration

1. Run `pnpm --filter @apps/pomo blender:open`.
2. Edit `character-studio.blend` and save it.
3. Run `pnpm --filter @apps/pomo blender:export` to create `src/components/assets/character-studio/scene.glb`.
4. Refresh `/dev/character` to verify the GLB with Babylon.js.

The export script uses Blender's standard glTF 2.0 exporter and includes animations. Keep the
Blender project isolated from the SolidStart root; only the generated GLB is served by the app.
