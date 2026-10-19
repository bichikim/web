use serde::Deserialize;
use std::{
    fs::File,
    io::{BufRead, BufReader, Read, Seek, SeekFrom},
    path::Path,
};

#[derive(Deserialize)]
struct Record {
    r#type: String,
    payload: Context,
}

#[derive(Deserialize)]
struct Context {
    turn_id: Option<String>,
    approvals_reviewer: Option<String>,
}

// Hooks omit the reviewer. Read only the exact turn's local metadata; an unknown
// or changed transcript format must leave the decision to Codex, never grant it.
pub fn uses_manual_review(path: &Path, turn: Option<&str>) -> bool {
    let Some(turn) = turn else {
        return false;
    };
    read_reviewer(path, turn).as_deref() == Some("user")
}

fn read_reviewer(path: &Path, turn: &str) -> Option<String> {
    const LIMIT: u64 = 4 * 1024 * 1024;
    let mut file = File::open(path).ok()?;
    let start = file.metadata().ok()?.len().saturating_sub(LIMIT);
    file.seek(SeekFrom::Start(start)).ok()?;
    let mut reader = BufReader::new(file.take(LIMIT));
    if start > 0 {
        let mut partial = Vec::new();
        reader.read_until(b'\n', &mut partial).ok()?;
    }
    reader
        .split(b'\n')
        .filter_map(|line| {
            let line = line.ok()?;
            let record: Record = serde_json::from_slice(&line).ok()?;
            (record.r#type == "turn_context" && record.payload.turn_id.as_deref() == Some(turn))
                .then_some(record.payload.approvals_reviewer)
        })
        .last()
        .flatten()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn only_explicit_manual_review_for_the_exact_turn_waits_for_poffo() {
        let mut file = tempfile::NamedTempFile::new().unwrap();
        writeln!(
            file,
            "{}",
            serde_json::json!({"type":"turn_context","payload":{
                "turn_id":"manual", "approvals_reviewer":"user"
            }})
        )
        .unwrap();
        for reviewer in ["auto_review", "guardian_subagent", "future"] {
            writeln!(
                file,
                "{}",
                serde_json::json!({"type":"turn_context","payload":{
                    "turn_id":reviewer, "approvals_reviewer":reviewer
                }})
            )
            .unwrap();
            assert!(!uses_manual_review(file.path(), Some(reviewer)));
        }
        assert!(uses_manual_review(file.path(), Some("manual")));
        assert!(!uses_manual_review(file.path(), Some("missing")));
        assert!(!uses_manual_review(file.path(), None));
    }

    #[test]
    fn missing_or_changed_metadata_defers_to_codex() {
        let mut file = tempfile::NamedTempFile::new().unwrap();
        writeln!(
            file,
            "invalid\n{{\"type\":\"turn_context\",\"payload\":{{\"turn_id\":\"turn\"}}}}"
        )
        .unwrap();
        assert!(!uses_manual_review(file.path(), Some("turn")));
        assert!(!uses_manual_review(
            Path::new("/missing/poffo-transcript"),
            Some("turn")
        ));
    }
}
