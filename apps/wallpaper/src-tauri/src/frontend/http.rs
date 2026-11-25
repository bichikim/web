//! Loopback-only bundled assets with real HTTP cross-origin isolation.
use std::{io, net::TcpListener, sync::Arc, time::Duration};
use tauri::AssetResolver;
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::TcpStream,
    sync::{Semaphore, oneshot},
    task::JoinSet,
};
const HEADER_LIMIT: usize = 16 * 1024;
const CONNECTION_LIMIT: usize = 8;
const IO_TIMEOUT: Duration = Duration::from_secs(5);
pub(super) const ORIGIN: &str = "http://127.0.0.1:1431";
struct Request<'a> {
    path: &'a str,
    head: bool,
}
fn request(text: &str) -> io::Result<Request<'_>> {
    let invalid = || io::Error::other("Invalid frontend request");
    let mut lines = text.split("\r\n");
    let mut start = lines.next().ok_or_else(invalid)?.split_whitespace();
    let method = start.next().ok_or_else(invalid)?;
    let path = start.next().ok_or_else(invalid)?;
    if !matches!(method, "GET" | "HEAD")
        || !path.starts_with('/')
        || path.starts_with("//")
        || path.contains('\\')
        || start.next() != Some("HTTP/1.1")
        || start.next().is_some()
    {
        return Err(invalid());
    }
    let mut host = false;
    for line in lines.filter(|line| !line.is_empty()) {
        let (key, value) = line.split_once(':').ok_or_else(invalid)?;
        let value = value.trim();
        if key.eq_ignore_ascii_case("host") {
            if host || value != "127.0.0.1:1431" {
                return Err(invalid());
            }
            host = true;
        }
        if key.eq_ignore_ascii_case("origin") && value != ORIGIN {
            return Err(invalid());
        }
        if key.eq_ignore_ascii_case("sec-fetch-site") && !matches!(value, "same-origin" | "none") {
            return Err(invalid());
        }
        if key.eq_ignore_ascii_case("content-length") && value != "0" {
            return Err(invalid());
        }
        if key.eq_ignore_ascii_case("transfer-encoding") {
            return Err(invalid());
        }
    }
    if !host {
        return Err(invalid());
    }
    Ok(Request {
        path: path.split('?').next().unwrap_or("/"),
        head: method == "HEAD",
    })
}
async fn read_headers(stream: &mut TcpStream) -> io::Result<Vec<u8>> {
    let mut bytes = Vec::new();
    let mut chunk = [0; 1024];
    while !bytes.windows(4).any(|x| x == b"\r\n\r\n") {
        let count = stream.read(&mut chunk).await?;
        if count == 0 || bytes.len() + count > HEADER_LIMIT {
            return Err(io::Error::other("Frontend request exceeds header limit"));
        }
        bytes.extend_from_slice(&chunk[..count]);
    }
    Ok(bytes)
}

async fn write_response(stream: &mut TcpStream, mut bytes: &[u8]) -> io::Result<()> {
    while !bytes.is_empty() {
        // Time out stalled writes. Large bundled models may take longer while still progressing.
        let written = tokio::time::timeout(IO_TIMEOUT, stream.write(bytes)).await??;
        if written == 0 {
            return Err(io::ErrorKind::WriteZero.into());
        }
        bytes = &bytes[written..];
    }
    Ok(())
}

async fn respond(mut stream: TcpStream, assets: Arc<AssetResolver<tauri::Wry>>) -> io::Result<()> {
    let bytes = tokio::time::timeout(IO_TIMEOUT, read_headers(&mut stream)).await??;
    let parsed = std::str::from_utf8(&bytes)
        .map_err(io::Error::other)
        .and_then(request);
    let Ok(request) = parsed else {
        write_response(
            &mut stream,
            b"HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
        )
        .await?;
        return Ok(());
    };
    let Some(asset) = assets.get(request.path.to_owned()) else {
        write_response(
            &mut stream,
            b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
        )
        .await?;
        return Ok(());
    };
    let mut headers = format!(
        "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nContent-Type: {}\r\nConnection: close\r\nCache-Control: no-cache\r\nCross-Origin-Opener-Policy: same-origin\r\nCross-Origin-Embedder-Policy: require-corp\r\nCross-Origin-Resource-Policy: same-origin\r\nX-Content-Type-Options: nosniff\r\n",
        asset.bytes.len(),
        asset.mime_type
    );
    if let Some(csp) = asset.csp_header {
        headers.push_str("Content-Security-Policy: ");
        headers.push_str(&csp);
        headers.push_str("\r\n")
    }
    headers.push_str("\r\n");
    write_response(&mut stream, headers.as_bytes()).await?;
    if !request.head {
        write_response(&mut stream, &asset.bytes).await?
    }
    stream.shutdown().await
}
pub(super) async fn serve(
    listener: TcpListener,
    assets: AssetResolver<tauri::Wry>,
    mut stop: oneshot::Receiver<()>,
) -> io::Result<()> {
    listener.set_nonblocking(true)?;
    let listener = tokio::net::TcpListener::from_std(listener)?;
    let assets = Arc::new(assets);
    let capacity = Arc::new(Semaphore::new(CONNECTION_LIMIT));
    let mut tasks = JoinSet::new();
    loop {
        tokio::select! {
         _=&mut stop=>{tasks.abort_all();while tasks.join_next().await.is_some(){} return Ok(())},
         completed=tasks.join_next(),if !tasks.is_empty()=>{let _=completed;},
         accepted=listener.accept()=>{let (stream,_)=accepted?;if let Ok(permit)=capacity.clone().try_acquire_owned(){let assets=assets.clone();tasks.spawn(async move{let _permit=permit;let _=respond(stream,assets).await;});}}
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn accepts_only_owned_host_origin_and_read_methods() {
        assert!(
            request("GET /index.html?surface=widget HTTP/1.1\r\nHost: 127.0.0.1:1431\r\n\r\n")
                .is_ok()
        );
        for value in [
            "GET / HTTP/1.1\r\nHost: evil.example\r\n\r\n",
            "POST / HTTP/1.1\r\nHost: 127.0.0.1:1431\r\n\r\n",
            "GET / HTTP/1.1\r\nHost: 127.0.0.1:1431\r\nOrigin: http://evil.example\r\n\r\n",
            "GET / HTTP/1.1\r\nHost: 127.0.0.1:1431\r\nSec-Fetch-Site: cross-site\r\n\r\n",
        ] {
            assert!(request(value).is_err());
        }
    }
}
