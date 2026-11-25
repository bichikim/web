use super::{Asset, Error};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    fs::{self, File},
    io::Read,
    path::{Path, PathBuf},
    time::SystemTime,
};

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub(super) struct Stamp {
    bytes: u64,
    modified: SystemTime,
    #[cfg(unix)]
    device: u64,
    #[cfg(unix)]
    inode: u64,
    #[cfg(unix)]
    changed: (i64, i64),
    #[cfg(windows)]
    volume: u32,
    #[cfg(windows)]
    index: u64,
    #[cfg(windows)]
    changed: i64,
}

impl Stamp {
    fn read(file: &File) -> Result<Self, Error> {
        let metadata = file.metadata()?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::MetadataExt;
            Ok(Self {
                bytes: metadata.len(),
                modified: metadata.modified()?,
                device: metadata.dev(),
                inode: metadata.ino(),
                changed: (metadata.ctime(), metadata.ctime_nsec()),
            })
        }
        #[cfg(windows)]
        {
            use std::os::windows::io::AsRawHandle;
            use windows::Win32::{
                Foundation::HANDLE,
                Storage::FileSystem::{
                    BY_HANDLE_FILE_INFORMATION, FILE_BASIC_INFO, FileBasicInfo,
                    GetFileInformationByHandle, GetFileInformationByHandleEx,
                },
            };
            let mut identity = BY_HANDLE_FILE_INFORMATION::default();
            let mut basic = FILE_BASIC_INFO::default();
            let handle = HANDLE(file.as_raw_handle());
            // Both APIs read metadata from the live file handle into correctly sized structures.
            unsafe {
                GetFileInformationByHandle(handle, &mut identity)?;
                GetFileInformationByHandleEx(
                    handle,
                    FileBasicInfo,
                    std::ptr::from_mut(&mut basic).cast(),
                    std::mem::size_of::<FILE_BASIC_INFO>() as u32,
                )?;
            }
            Ok(Self {
                bytes: metadata.len(),
                modified: metadata.modified()?,
                volume: identity.dwVolumeSerialNumber,
                index: (u64::from(identity.nFileIndexHigh) << 32)
                    | u64::from(identity.nFileIndexLow),
                changed: basic.ChangeTime,
            })
        }
    }
}

#[derive(Deserialize, Serialize)]
struct Record {
    version: u8,
    sha256: String,
    stamp: Stamp,
}

fn record_path(path: &Path) -> PathBuf {
    let mut name = path.as_os_str().to_owned();
    name.push(".verification.json");
    PathBuf::from(name)
}

fn store(path: &Path, record: &Record) -> Result<(), Error> {
    let mut temporary =
        tempfile::NamedTempFile::new_in(path.parent().ok_or("Missing model directory")?)?;
    serde_json::to_writer(temporary.as_file_mut(), record)?;
    temporary.persist(record_path(path))?;
    Ok(())
}

fn open(path: &Path) -> Result<Option<File>, Error> {
    match File::open(path) {
        Ok(file) => Ok(Some(file)),
        Err(cause) if cause.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(cause) => Err(cause.into()),
    }
}

fn matches(file: &mut File, asset: &Asset) -> Result<bool, Error> {
    if file.metadata()?.len() != asset.bytes {
        return Ok(false);
    }
    let mut hash = Sha256::new();
    let mut buffer = vec![0; 64 * 1024];
    loop {
        let count = file.read(&mut buffer)?;
        if count == 0 {
            break;
        }
        hash.update(&buffer[..count]);
    }
    Ok(format!("{:x}", hash.finalize()) == asset.sha256)
}

/// Checks unpublished migration files without leaving verification records beside temporary files.
pub(super) fn checksum(path: &Path, asset: &Asset) -> Result<bool, Error> {
    match open(path)? {
        Some(mut file) => matches(&mut file, asset),
        None => Ok(false),
    }
}

/// Reuses a receipt only for the expected digest and an unchanged file identity and change stamp.
pub(super) fn inspect(
    path: &Path,
    asset: &Asset,
    cached: Option<&Stamp>,
) -> Result<Option<Stamp>, Error> {
    let Some(mut file) = open(path)? else {
        return Ok(None);
    };
    let before = Stamp::read(&file)?;
    if before.bytes != asset.bytes {
        return Ok(None);
    }
    if cached == Some(&before) {
        return Ok(Some(before));
    }
    let record = File::open(record_path(path))
        .ok()
        .and_then(|file| serde_json::from_reader::<_, Record>(file.take(4096)).ok());
    if record.is_some_and(|record| {
        record.version == 1 && record.sha256 == asset.sha256 && record.stamp == before
    }) {
        return Ok(Some(before));
    }
    if !matches(&mut file, asset)? {
        let _ = fs::remove_file(record_path(path));
        return Ok(None);
    }
    // Detect in-place writes and atomic replacement while the digest was being calculated.
    let current = open(path)?;
    if Stamp::read(&file)? != before
        || current.as_ref().map(Stamp::read).transpose()?.as_ref() != Some(&before)
    {
        return Ok(None);
    }
    let _ = store(
        path,
        &Record {
            version: 1,
            sha256: asset.sha256.clone(),
            stamp: before.clone(),
        },
    );
    Ok(Some(before))
}
