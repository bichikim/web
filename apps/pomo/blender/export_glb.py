from pathlib import Path

import bpy


blend_path = Path(bpy.data.filepath).resolve()

if not blend_path.name:
    raise RuntimeError("Blender 프로젝트를 먼저 저장해야 합니다.")

output_path = (
    blend_path.parent.parent
    / "src"
    / "components"
    / "assets"
    / "character-studio"
    / "scene.glb"
)
output_path.parent.mkdir(parents=True, exist_ok=True)

bpy.ops.export_scene.gltf(
    filepath=str(output_path),
    export_animations=True,
    export_format="GLB",
)

print(f"Pomo GLB export completed: {output_path}")
