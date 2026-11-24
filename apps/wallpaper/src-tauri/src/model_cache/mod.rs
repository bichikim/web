use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::{
    collections::HashMap,
    path::{Component, Path, PathBuf},
    sync::{Arc, LazyLock},
};
use tokio::{io::AsyncWriteExt, sync::Mutex};

mod verification;

pub(crate) type Error = Box<dyn std::error::Error + Send + Sync>;
type Verified = HashMap<(PathBuf, String), verification::Stamp>;
type Preparation = Arc<Mutex<Verified>>;
static CACHE: LazyLock<Mutex<HashMap<PathBuf, Preparation>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

#[derive(Clone, Deserialize)]
pub(crate) struct Asset {
    pub file: String,
    pub url: String,
    pub bytes: u64,
    pub sha256: String,
}

async fn valid(path: &Path, asset: &Asset, verified: &mut Verified) -> Result<bool, Error> {
    let key = (path.to_owned(), asset.sha256.clone());
    let cached = verified.get(&key).cloned();
    let source = path.to_owned();
    let expected = asset.clone();
    let stamp = tokio::task::spawn_blocking(move || {
        verification::inspect(&source, &expected, cached.as_ref())
    })
    .await??;
    if let Some(stamp) = stamp {
        verified.insert(key, stamp);
        return Ok(true);
    }
    verified.remove(&key);
    Ok(false)
}

async fn checksum(path: &Path, asset: &Asset) -> Result<bool, Error> {
    let path = path.to_owned();
    let asset = asset.clone();
    tokio::task::spawn_blocking(move || verification::checksum(&path, &asset)).await?
}

/// Reuses verified shared files and moves owned legacy caches before attempting a download.
pub(crate) async fn ensure(
    cache: &Path,
    asset: &Asset,
    previous: &[PathBuf],
) -> Result<PathBuf, Error> {
    if asset.file.is_empty()
        || !Path::new(&asset.file)
            .components()
            .all(|part| matches!(part, Component::Normal(_)))
    {
        return Err("Invalid model cache path".into());
    }
    let destination = cache.join(&asset.file);
    let preparation = CACHE
        .lock()
        .await
        .entry(destination.clone())
        .or_insert_with(|| Arc::new(Mutex::new(HashMap::new())))
        .clone();
    let mut verified = preparation.lock().await;
    if valid(&destination, asset, &mut verified).await? {
        return Ok(destination);
    }
    tokio::fs::create_dir_all(destination.parent().ok_or("Missing model directory")?).await?;
    for root in previous {
        let source = root.join(&asset.file);
        if checksum(&source, asset).await? {
            if tokio::fs::rename(&source, &destination).await.is_err() {
                let temporary = tempfile::NamedTempFile::new_in(destination.parent().unwrap())?;
                tokio::fs::copy(&source, temporary.path()).await?;
                if !checksum(temporary.path(), asset).await? {
                    return Err("Model migration checksum mismatch".into());
                }
                temporary.persist(&destination)?;
                tokio::fs::remove_file(&source).await?;
            }
            if !valid(&destination, asset, &mut verified).await? {
                return Err("Model migration checksum mismatch".into());
            }
            return Ok(destination);
        }
    }
    let temporary = tempfile::NamedTempFile::new_in(destination.parent().unwrap())?;
    let mut file = tokio::fs::File::from_std(temporary.reopen()?);
    let mut response = reqwest::Client::new()
        .get(&asset.url)
        .send()
        .await?
        .error_for_status()?;
    let mut hash = Sha256::new();
    let mut length = 0u64;
    while let Some(chunk) = response.chunk().await? {
        length += chunk.len() as u64;
        if length > asset.bytes {
            return Err("Model download exceeds its manifest size".into());
        }
        hash.update(&chunk);
        file.write_all(&chunk).await?;
    }
    if length != asset.bytes || format!("{:x}", hash.finalize()) != asset.sha256 {
        return Err("Model download checksum mismatch".into());
    }
    file.flush().await?;
    drop(file);
    temporary.persist(&destination)?;
    if !valid(&destination, asset, &mut verified).await? {
        return Err("Model publication checksum mismatch".into());
    }
    Ok(destination)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn asset() -> Asset {
        Asset {
            file: "nested/model.bin".into(),
            url: "http://127.0.0.1:1/must-not-download".into(),
            bytes: 5,
            sha256: format!("{:x}", Sha256::digest(b"model")),
        }
    }

    #[tokio::test]
    async fn cached_models_do_not_wait_for_an_unrelated_download() {
        use std::time::Duration;
        use tokio::io::{AsyncReadExt, AsyncWriteExt};
        let cache = tempfile::tempdir().unwrap();
        cached_model(cache.path());
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = format!("http://{}/model", listener.local_addr().unwrap());
        let (started, accepted) = tokio::sync::oneshot::channel();
        let (release, resumed) = tokio::sync::oneshot::channel();
        let server = tokio::spawn(async move {
            let (mut stream, _) = listener.accept().await.unwrap();
            let mut request = [0; 4096];
            assert!(stream.read(&mut request).await.unwrap() > 0);
            started.send(()).unwrap();
            resumed.await.unwrap();
            stream
                .write_all(
                    b"HTTP/1.1 200 OK\r\nContent-Length: 5\r\nConnection: close\r\n\r\nmodel",
                )
                .await
                .unwrap();
        });
        let directory = cache.path().to_owned();
        let download = tokio::spawn(async move {
            ensure(
                &directory,
                &Asset {
                    file: "other.bin".into(),
                    url,
                    ..asset()
                },
                &[],
            )
            .await
        });
        tokio::time::timeout(Duration::from_secs(2), accepted)
            .await
            .unwrap()
            .unwrap();
        let cached = tokio::time::timeout(
            Duration::from_millis(100),
            ensure(cache.path(), &asset(), &[]),
        )
        .await;
        release.send(()).unwrap();
        tokio::time::timeout(Duration::from_secs(2), download)
            .await
            .unwrap()
            .unwrap()
            .unwrap();
        tokio::time::timeout(Duration::from_secs(2), server)
            .await
            .unwrap()
            .unwrap();
        assert!(
            cached.is_ok(),
            "an unrelated download blocked an existing model"
        );
        assert_eq!(std::fs::read(cached.unwrap().unwrap()).unwrap(), b"model");
    }

    fn cached_model(cache: &Path) -> PathBuf {
        let path = cache.join("nested/model.bin");
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(&path, b"model").unwrap();
        path
    }

    #[tokio::test]
    async fn reuses_persisted_verification_with_an_empty_process_cache() {
        let cache = tempfile::tempdir().unwrap();
        let path = cached_model(cache.path());
        assert!(valid(&path, &asset(), &mut Verified::new()).await.unwrap());
        let record = cache.path().join("nested/model.bin.verification.json");
        let mut bytes = std::fs::read(&record).unwrap();
        bytes.extend_from_slice(b"\n ");
        std::fs::write(&record, &bytes).unwrap();
        assert!(valid(&path, &asset(), &mut Verified::new()).await.unwrap());
        assert_eq!(std::fs::read(record).unwrap(), bytes);
    }

    #[tokio::test]
    async fn rejects_a_modified_file_even_when_its_size_and_mtime_are_restored() {
        let cache = tempfile::tempdir().unwrap();
        let path = cached_model(cache.path());
        let mut verified = Verified::new();
        assert!(valid(&path, &asset(), &mut verified).await.unwrap());
        let modified = std::fs::metadata(&path).unwrap().modified().unwrap();
        std::fs::write(&path, b"wrong").unwrap();
        std::fs::OpenOptions::new()
            .write(true)
            .open(&path)
            .unwrap()
            .set_times(std::fs::FileTimes::new().set_modified(modified))
            .unwrap();
        assert!(!valid(&path, &asset(), &mut verified).await.unwrap());
        assert!(!valid(&path, &asset(), &mut Verified::new()).await.unwrap());
    }

    #[tokio::test]
    async fn rejects_a_replacement_with_the_original_size_and_mtime() {
        let cache = tempfile::tempdir().unwrap();
        let path = cached_model(cache.path());
        let mut verified = Verified::new();
        assert!(valid(&path, &asset(), &mut verified).await.unwrap());
        let original = std::fs::File::open(&path).unwrap();
        let modified = original.metadata().unwrap().modified().unwrap();
        let replacement = tempfile::NamedTempFile::new_in(path.parent().unwrap()).unwrap();
        std::fs::write(replacement.path(), b"wrong").unwrap();
        replacement
            .as_file()
            .set_times(std::fs::FileTimes::new().set_modified(modified))
            .unwrap();
        replacement.persist(&path).unwrap();
        assert!(!valid(&path, &asset(), &mut verified).await.unwrap());
        assert!(!valid(&path, &asset(), &mut Verified::new()).await.unwrap());
    }

    #[tokio::test]
    async fn repairs_a_corrupt_verification_record_after_hashing_the_model() {
        let cache = tempfile::tempdir().unwrap();
        let path = cached_model(cache.path());
        let record = cache.path().join("nested/model.bin.verification.json");
        std::fs::write(&record, b"{broken").unwrap();
        assert!(valid(&path, &asset(), &mut Verified::new()).await.unwrap());
        let bytes = std::fs::read(record).unwrap();
        assert!(serde_json::from_slice::<serde_json::Value>(&bytes).is_ok());
    }

    #[tokio::test]
    async fn rechecks_a_persisted_file_when_the_manifest_checksum_changes() {
        let cache = tempfile::tempdir().unwrap();
        let path = cached_model(cache.path());
        assert!(valid(&path, &asset(), &mut Verified::new()).await.unwrap());
        let expected = Asset {
            sha256: format!("{:x}", Sha256::digest(b"other")),
            ..asset()
        };
        assert!(!valid(&path, &expected, &mut Verified::new()).await.unwrap());
    }

    #[tokio::test]
    async fn keeps_verified_models_usable_when_the_record_cannot_be_written() {
        let cache = tempfile::tempdir().unwrap();
        let path = cached_model(cache.path());
        std::fs::create_dir(cache.path().join("nested/model.bin.verification.json")).unwrap();
        assert!(valid(&path, &asset(), &mut Verified::new()).await.unwrap());
    }

    #[tokio::test]
    async fn refreshes_the_record_for_a_replacement_with_valid_contents() {
        let cache = tempfile::tempdir().unwrap();
        let path = cached_model(cache.path());
        assert!(valid(&path, &asset(), &mut Verified::new()).await.unwrap());
        let record = cache.path().join("nested/model.bin.verification.json");
        let previous = std::fs::read(&record).unwrap();
        let original = std::fs::File::open(&path).unwrap();
        let replacement = tempfile::NamedTempFile::new_in(path.parent().unwrap()).unwrap();
        std::fs::write(replacement.path(), b"model").unwrap();
        replacement.persist(&path).unwrap();
        assert!(valid(&path, &asset(), &mut Verified::new()).await.unwrap());
        assert_ne!(std::fs::read(&record).unwrap(), previous);
        assert_eq!(original.metadata().unwrap().len(), 5);
    }

    fn serve(body: &'static [u8]) -> (String, std::thread::JoinHandle<()>) {
        use std::io::{Read, Write};
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let url = format!("http://{}/model", listener.local_addr().unwrap());
        let request = std::thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let mut headers = [0; 4096];
            assert!(stream.read(&mut headers).unwrap() > 0);
            write!(
                stream,
                "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                body.len()
            )
            .unwrap();
            stream.write_all(body).unwrap();
        });
        (url, request)
    }

    #[tokio::test]
    async fn overlapping_requests_share_one_download_for_the_same_path() {
        let cache = tempfile::tempdir().unwrap();
        let (url, server) = serve(b"model");
        let expected = Asset { url, ..asset() };
        let (first, second) = tokio::join!(
            ensure(cache.path(), &expected, &[]),
            ensure(cache.path(), &expected, &[])
        );
        assert_eq!(first.unwrap(), second.unwrap());
        server.join().unwrap();
    }

    #[tokio::test]
    async fn publishes_a_verified_download_and_reuses_it_after_the_server_stops() {
        let cache = tempfile::tempdir().unwrap();
        let (url, request) = serve(b"model");
        let file = Asset { url, ..asset() };
        let path = ensure(cache.path(), &file, &[]).await.unwrap();
        request.join().unwrap();
        assert_eq!(std::fs::read(&path).unwrap(), b"model");
        assert_eq!(ensure(cache.path(), &file, &[]).await.unwrap(), path);
        assert_eq!(
            std::fs::read_dir(path.parent().unwrap()).unwrap().count(),
            2
        );
    }

    #[tokio::test]
    async fn discards_an_invalid_download_without_publishing_a_model_or_partial_file() {
        let cache = tempfile::tempdir().unwrap();
        let (url, request) = serve(b"wrong");
        let file = Asset { url, ..asset() };
        assert!(ensure(cache.path(), &file, &[]).await.is_err());
        request.join().unwrap();
        let path = cache.path().join(&file.file);
        assert!(!path.exists());
        assert_eq!(
            std::fs::read_dir(path.parent().unwrap()).unwrap().count(),
            0
        );
    }
    #[tokio::test]
    async fn reuses_a_valid_shared_model_without_downloading_or_copying_it() {
        let cache = tempfile::tempdir().unwrap();
        let file = asset();
        let path = cache.path().join(&file.file);
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(&path, b"model").unwrap();
        assert_eq!(ensure(cache.path(), &file, &[]).await.unwrap(), path);
        assert_eq!(std::fs::read(path).unwrap(), b"model");
    }
    #[tokio::test]
    async fn moves_a_verified_legacy_model_into_the_shared_cache_offline() {
        let cache = tempfile::tempdir().unwrap();
        let previous = tempfile::tempdir().unwrap();
        let file = asset();
        let path = previous.path().join(&file.file);
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(&path, b"model").unwrap();
        let moved = ensure(cache.path(), &file, &[previous.path().to_owned()])
            .await
            .unwrap();
        assert!(!path.exists());
        assert_eq!(std::fs::read(moved).unwrap(), b"model");
        assert!(
            cache
                .path()
                .join("nested/model.bin.verification.json")
                .is_file()
        );
        assert_eq!(
            std::fs::read_dir(previous.path().join("nested"))
                .unwrap()
                .count(),
            0
        );
    }
    #[tokio::test]
    async fn rejects_a_same_size_invalid_cache_without_consuming_the_legacy_file() {
        let cache = tempfile::tempdir().unwrap();
        let previous = tempfile::tempdir().unwrap();
        let file = asset();
        let path = previous.path().join(&file.file);
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(&path, b"wrong").unwrap();
        assert!(
            ensure(cache.path(), &file, &[previous.path().to_owned()])
                .await
                .is_err()
        );
        assert_eq!(std::fs::read(path).unwrap(), b"wrong");
        assert!(!cache.path().join(&file.file).exists());
    }
}
