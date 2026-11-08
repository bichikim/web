#[path = "../../src/runtime_paths.rs"]
mod runtime_paths;

fn main() {
    let result = run();
    if let Err(error) = result {
        eprintln!("{error}");
        std::process::exit(1);
    }
}

fn run() -> Result<(), String> {
    let executable = std::env::current_exe()
        .and_then(std::fs::canonicalize)
        .map_err(|error| error.to_string())?;
    let runtime = runtime_paths::RuntimePaths::installed(&executable)?;
    if !runtime.node.is_file() || !runtime.root.join("cli/main.js").is_file() {
        return Err("Poffo runtime is missing. Keep the CLI inside the installed app.".into());
    }
    let mut command = runtime.command();
    command.args(std::env::args_os().skip(1));
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        Err(command.exec().to_string())
    }
    #[cfg(not(unix))]
    {
        let status = command.status().map_err(|error| error.to_string())?;
        std::process::exit(status.code().unwrap_or(1));
    }
}
