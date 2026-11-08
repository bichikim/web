use std::path::{Path, PathBuf};
use std::process::Command;

pub struct RuntimePaths {
    pub node: PathBuf,
    pub root: PathBuf,
    pub application: PathBuf,
    pub launcher: PathBuf,
}

impl RuntimePaths {
    pub fn installed(executable: &Path) -> Result<Self, String> {
        let directory = executable
            .parent()
            .ok_or("Executable directory is unavailable")?;
        let resources = if cfg!(target_os = "macos") {
            directory
                .parent()
                .ok_or("App bundle directory is unavailable")?
                .join("Resources")
        } else {
            directory.to_path_buf()
        };
        let suffix = if cfg!(windows) { ".exe" } else { "" };
        Ok(Self {
            node: directory.join(format!("poffo-node{suffix}")),
            root: resources.join("runtime"),
            application: directory.join(format!("Poffo{suffix}")),
            launcher: directory.join(format!("poffo-cli{suffix}")),
        })
    }

    pub fn command(&self) -> Command {
        let mut command = Command::new(&self.node);
        command
            .arg(self.root.join("cli/main.js"))
            .env("POFFO_RUNTIME_ROOT", &self.root)
            .env("POFFO_DESKTOP_APP", &self.application)
            .env("POFFO_CLI_EXECUTABLE", &self.launcher)
            .env_remove("NODE_OPTIONS")
            .env_remove("NODE_PATH");
        command
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_runtime_and_command_relative_to_the_installed_executable() {
        let executable = if cfg!(target_os = "macos") {
            Path::new("/Applications/Poffo App.app/Contents/MacOS/poffo-cli")
        } else {
            Path::new("C:/Program Files/Poffo/poffo-cli.exe")
        };
        let runtime = RuntimePaths::installed(executable).unwrap();
        let expected = if cfg!(target_os = "macos") {
            Path::new("/Applications/Poffo App.app/Contents/Resources/runtime")
        } else {
            Path::new("C:/Program Files/Poffo/runtime")
        };
        assert_eq!(runtime.root, expected);
        let command = runtime.command();
        assert_eq!(command.get_program(), runtime.node.as_os_str());
        assert_eq!(
            command.get_args().collect::<Vec<_>>(),
            [expected.join("cli/main.js").as_os_str()]
        );
        for name in ["NODE_OPTIONS", "NODE_PATH"] {
            assert!(
                command
                    .get_envs()
                    .any(|(key, value)| key == name && value.is_none())
            );
        }
    }
}
