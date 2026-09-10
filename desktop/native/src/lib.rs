#![deny(clippy::all)]

use std::collections::HashMap;
use std::fs::File;
use std::io;
use std::path::Path;

use napi::bindgen_prelude::*;
use napi_derive::napi;
use walkdir::WalkDir;

/// Phase 3 milestone: the smallest possible proof that the main process can
/// call into Rust and get a typed result back. Every later Rust feature
/// (e.g. Phase 4's receipt-folder hashing below) reuses this exact main ->
/// preload -> renderer wiring, just with a different function here.
#[napi]
pub fn ping(name: String) -> String {
    format!("hello {name} from Rust")
}

/// One file found during a folder scan, identified by its content hash.
#[napi(object)]
pub struct ScannedFile {
    pub path: String,
    pub name: String,
    /// Bytes. `f64` (not `u64`/`i64`) because napi maps integer fields to a
    /// plain JS `number`, which loses precision above 2^53 — irrelevant for
    /// receipt-sized files, and avoids forcing BigInt on the TS side.
    pub size: f64,
    pub hash: String,
}

/// A set of two or more files with an identical content hash.
#[napi(object)]
pub struct DuplicateGroup {
    pub hash: String,
    pub files: Vec<ScannedFile>,
}

#[napi(object)]
pub struct ScanResult {
    pub root: String,
    pub total_files: u32,
    pub total_size: f64,
    pub duplicate_file_count: u32,
    pub duplicate_groups: Vec<DuplicateGroup>,
}

/// Phase 4: give Rust a real job. Walks `root`, content-hashes every file
/// with BLAKE3, and reports duplicates + totals — the check a receipt folder
/// deserves before its files are uploaded to claim-service (Phase 10), and
/// genuinely CPU-bound work over many files, which is where Rust earns its
/// place over doing the same walk in Node.
#[napi]
pub fn scan_folder(root: String) -> Result<ScanResult> {
    let root_path = Path::new(&root);
    if !root_path.is_dir() {
        return Err(Error::from_reason(format!(
            "not a directory: {root}"
        )));
    }

    let mut by_hash: HashMap<String, Vec<ScannedFile>> = HashMap::new();
    let mut total_files: u32 = 0;
    let mut total_size: f64 = 0.0;

    for entry in WalkDir::new(root_path)
        .into_iter()
        .filter_map(|entry| entry.ok())
    {
        if !entry.file_type().is_file() {
            continue;
        }
        let path = entry.path();
        let Ok(metadata) = entry.metadata() else {
            continue;
        };
        let Ok(hash) = hash_file(path) else {
            continue;
        };

        total_files += 1;
        total_size += metadata.len() as f64;

        by_hash.entry(hash.clone()).or_default().push(ScannedFile {
            path: path.to_string_lossy().into_owned(),
            name: entry.file_name().to_string_lossy().into_owned(),
            size: metadata.len() as f64,
            hash,
        });
    }

    let mut duplicate_groups: Vec<DuplicateGroup> = by_hash
        .into_iter()
        .filter(|(_, files)| files.len() > 1)
        .map(|(hash, files)| DuplicateGroup { hash, files })
        .collect();
    // Largest duplicate groups first — the ones most worth a user's attention.
    duplicate_groups.sort_by(|a, b| b.files.len().cmp(&a.files.len()));

    let duplicate_file_count: u32 = duplicate_groups
        .iter()
        .map(|group| group.files.len() as u32)
        .sum();

    Ok(ScanResult {
        root,
        total_files,
        total_size,
        duplicate_file_count,
        duplicate_groups,
    })
}

fn hash_file(path: &Path) -> io::Result<String> {
    let mut hasher = blake3::Hasher::new();
    let mut file = File::open(path)?;
    io::copy(&mut file, &mut hasher)?;
    Ok(hasher.finalize().to_hex().to_string())
}
