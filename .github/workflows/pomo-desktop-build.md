# Pomo Desktop builds

[Build Pomo Desktop](./pomo-desktop-build.yml) produces installers without deploying
the Pomo web service. In GitHub Actions, select **Build Pomo Desktop**, choose the
desired branch, and click **Run workflow**. All platform builds must succeed
before the workflow creates a tag on the exact build commit and collects the
installers into a draft GitHub Release. The run summary links to the draft.
Review the files and publish the draft from the Releases page.

No manual tag push or version bump is required. Tags include the Tauri app version
and GitHub run ID, so separate runs can release the same app version. Re-running
the same run reuses its tag and can replace draft assets; tags pointing to another
commit and published releases are not modified.
Each platform keeps one artifact per run, replacing it on a successful rebuild
so release downloads do not merge installers from older attempts.

Actions artifacts are temporary test downloads. GitHub Release assets are the
distribution copies. Repository visibility controls access: assets in a private
repository are not public downloads. A public download site would need a public
release repository or separate hosting.

These builds use the production API origin. They do not require application
server secrets. macOS uses ad-hoc signing, without Apple notarization; users may
need to approve installation in Privacy & Security settings. Windows installers
are unsigned and may trigger SmartScreen. Before broad distribution, configure
platform code signing following the official
[macOS](https://v2.tauri.app/distribute/sign/macos/) and
[Windows](https://v2.tauri.app/distribute/sign/windows/) guides.

Windows desktop integration is partially supported; Linux desktop surfaces are
not supported by the [native module](../../packages/desktop-surface/Cargo.toml).
The workflow packages installers; it does not configure in-app automatic updates.
