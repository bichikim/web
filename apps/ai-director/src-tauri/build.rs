#[path = "build/model.rs"]
mod model;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let path = model::prepare()?;
    println!("cargo:rustc-env=SPANF_MODEL_PATH={}", path.display());
    println!("cargo:rerun-if-changed={}", path.display());
    println!("cargo:rerun-if-changed=../spanf-model.json");
    println!("cargo:rerun-if-changed=build/model.rs");
    println!("cargo:rerun-if-env-changed=XDG_CACHE_HOME");
    println!("cargo:rerun-if-env-changed=LOCALAPPDATA");
    tauri_build::build();
    Ok(())
}
