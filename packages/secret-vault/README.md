# Secret Vault

Private git-backed environment secret vault CLI.

`secret-vault` stores secrets in a private GitHub repository at:

```text
<namespace>/vault.json
```

Encrypted storage is the default. Plain storage is available only when explicitly configured.

## Install

This package is part of the workspace:

```sh
pnpm --filter @winter-love/secret-vault build
```

CLI binary:

```sh
secret-vault
```

## Config

Default config path:

```text
.secret-vault.json
```

Override:

```sh
secret-vault --config ./custom-secret-vault.json list
```

Example:

```json
{
  "repository": "git@github.com:owner/private-secret-vault.git",
  "namespace": "my-app",
  "exportPath": ".env.local",
  "storage": "encrypted"
}
```

Fields:

- `repository`: private vault repository URL.
- `namespace`: optional. If missing, the current project git remote URL is used.
- `exportPath`: optional. Defaults to `.env.local`. Used by `sync`.
- `storage`: optional. Defaults to `encrypted`; use `plain` only when you intentionally want plaintext.

`vaultPath` is not supported. The layout is always `<namespace>/vault.json`.

## Storage Layout

`namespace` is a folder name inside the vault repository, not a local project path. One vault repo can hold secrets for multiple projects:

```text
private-secret-vault/          # repository in config
  my-app/
    vault.json                 # namespace "my-app"
  other-app/
    vault.json                 # another project
```

If `namespace` is omitted, the current project's `origin` remote is normalized and used instead. For `git@github.com:owner/my-app.git`:

```text
private-secret-vault/
  git-github.com-owner-my-app/
    vault.json
```

After `secret-vault add FOO=bar` and `secret-vault add TOKEN=secret`, `my-app/vault.json` in the vault repo looks like this.

Encrypted (default) — keys and values live inside `ciphertext`; only crypto metadata is visible in git:

```json
{
  "version": 1,
  "storage": "encrypted",
  "kdf": "scrypt",
  "salt": "a1b2c3...",
  "scryptParams": {"N": 16384, "r": 8, "p": 1},
  "iv": "d4e5f6...",
  "authTag": "789abc...",
  "ciphertext": "def012..."
}
```

Plain (only when `"storage": "plain"`) — values are readable in the repository:

```json
{
  "version": 1,
  "storage": "plain",
  "values": {
    "FOO": "bar",
    "TOKEN": "secret"
  }
}
```

On the application side, `.secret-vault.json` only points at the vault repo. Secrets are copied into the project with `export`:

```text
my-app/                        # application repo (where you run the CLI)
  .secret-vault.json           # repository + namespace; no passphrase or secrets
  .env.local                   # created by `secret-vault export --out .env.local`
```

## Create Config

Use an existing private repository:

```sh
secret-vault init --repository git@github.com:owner/private-secret-vault.git
```

Create a new private GitHub repository through `gh`:

```sh
secret-vault init --create-repo owner/private-secret-vault
```

Or create/save repository config directly:

```sh
secret-vault repo create owner/private-secret-vault
```

The GitHub flow uses `gh auth status`, `gh auth login`, and `gh repo create`.

## Add And Modify

Quick assignment:

```sh
secret-vault add FOO=bar
secret-vault modify FOO=new-value
```

Value option:

```sh
secret-vault add FOO --value "hello world"
secret-vault modify TOKEN --value "a=b=c"
```

stdin value:

```sh
printf '%s' "$TOKEN" | secret-vault add TOKEN --stdin
cat private-key.pem | secret-vault modify PRIVATE_KEY --stdin
```

Prompt value:

```sh
secret-vault add FOO
secret-vault modify FOO
```

`add` asks before overwriting an existing key. `modify` asks before creating a missing key.

## Import And Export

Import dotenv values:

```sh
secret-vault import .env.local
cat .env.production | secret-vault import --stdin
```

Export dotenv values:

```sh
secret-vault export
secret-vault export --out .env.local
```

Sync vault secrets into the configured env file:

```sh
secret-vault sync
secret-vault sync --out .env.staging
```

Packages without `.secret-vault.json` skip `sync` silently. In a monorepo, run it recursively:

```sh
pnpm -r exec secret-vault sync
```

Or add a package script where needed:

```json
{
  "scripts": {
    "env:sync": "secret-vault sync"
  }
}
```

`list` prints keys only:

```sh
secret-vault list
```

## Encryption

Encrypted vaults use Node `crypto`:

- passphrase-derived key with `scrypt`
- `AES-256-GCM` encrypted payload
- stored metadata: `version`, `kdf`, `salt`, `iv`, `authTag`, `ciphertext`

Passphrase sources:

```sh
secret-vault add FOO=bar
SECRET_VAULT_PASSPHRASE=... secret-vault --passphrase-env export
printf '%s' "$SECRET_VAULT_PASSPHRASE" | secret-vault --passphrase-stdin export
```

The passphrase is never written to `.secret-vault.json` or the vault repository.

## Repository Sync

The CLI clones or updates the configured vault repository in a local cache, writes the namespace vault file, commits, and pushes.

Commit message format:

```text
Update secret vault namespace <namespace>
```
