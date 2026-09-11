#![deny(clippy::all)]

use std::collections::HashMap;
use std::fs::File;
use std::io;
use std::path::Path;
use std::sync::{Mutex, OnceLock};

use napi::bindgen_prelude::*;
use napi_derive::napi;
use rusqlite::{params, Connection, OptionalExtension};
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

// ---------------------------------------------------------------------------
// Offline-first local DB: a generic cache table (write-through GET cache) and
// a generic write queue (pending_operations), both keyed by request path —
// apiManager.ts's transport is already generic across all ~100 endpoints, and
// this stays generic too rather than modelling each domain. See the plan's
// "Local DB" / "Negative local IDs" sections for the full design.
//
// A single global connection behind a Mutex: every call here is a fast local
// SQLite operation on the main process's own thread, no need for a pool.
// ---------------------------------------------------------------------------

static DB: OnceLock<Mutex<Connection>> = OnceLock::new();

const SCHEMA_SQL: &str = "
    CREATE TABLE IF NOT EXISTS cache (
        cache_key  TEXT PRIMARY KEY,
        path       TEXT NOT NULL,
        data       TEXT NOT NULL,
        updated_at REAL NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cache_path ON cache(path);

    CREATE TABLE IF NOT EXISTS pending_operations (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        local_id    INTEGER,
        method      TEXT NOT NULL,
        path        TEXT NOT NULL,
        body        TEXT,
        created_at  REAL NOT NULL,
        status      TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        last_error  TEXT
    );

    CREATE TABLE IF NOT EXISTS kv_meta (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
";

fn to_napi_err<E: std::fmt::Display>(err: E) -> Error {
    Error::from_reason(err.to_string())
}

fn with_db<T>(f: impl FnOnce(&Connection) -> rusqlite::Result<T>) -> Result<T> {
    let guard = DB
        .get()
        .ok_or_else(|| Error::from_reason("initDb has not been called yet"))?
        .lock()
        .map_err(|_| Error::from_reason("local DB mutex was poisoned by a previous panic"))?;
    f(&guard).map_err(to_napi_err)
}

/// Opens (or creates) the local SQLite DB at `path` and applies the schema.
/// `path` is computed in Node from `app.getPath("userData")`, since Rust has
/// no notion of Electron's per-OS data directories. Must be called exactly
/// once, before any other function in this module.
#[napi]
pub fn init_db(path: String) -> Result<()> {
    let conn = Connection::open(&path).map_err(to_napi_err)?;
    conn.execute_batch(SCHEMA_SQL).map_err(to_napi_err)?;
    DB.set(Mutex::new(conn))
        .map_err(|_| Error::from_reason("initDb was called more than once"))
}

/// Looks up a cached GET response by its full request path+querystring.
/// Returns the raw JSON string previously stored by `cachePut`, or `None`.
#[napi]
pub fn cache_get(key: String) -> Result<Option<String>> {
    with_db(|conn| {
        conn.query_row("SELECT data FROM cache WHERE cache_key = ?1", params![key], |row| {
            row.get::<_, String>(0)
        })
        .optional()
    })
}

/// Write-through cache upsert, called after every successful GET.
#[napi]
pub fn cache_put(key: String, path: String, data: String, updated_at: f64) -> Result<()> {
    with_db(|conn| {
        conn.execute(
            "INSERT INTO cache (cache_key, path, data, updated_at) VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(cache_key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
            params![key, path, data, updated_at],
        )?;
        Ok(())
    })
}

/// Drops every cache row whose path starts with `prefix` — used after a
/// write to invalidate stale list/detail responses for that same resource.
#[napi]
pub fn cache_invalidate_prefix(prefix: String) -> Result<()> {
    with_db(|conn| {
        conn.execute("DELETE FROM cache WHERE path LIKE ?1", params![format!("{prefix}%")])?;
        Ok(())
    })
}

/// Allocates the next negative local ID for an offline "create" (-1, -2, ...).
/// Persisted in `kv_meta` rather than derived from `MIN(local_id)`, so it
/// keeps counting down correctly even after old rows are removed on sync.
#[napi]
pub fn next_local_id() -> Result<i32> {
    with_db(|conn| {
        let current: i32 = conn
            .query_row("SELECT value FROM kv_meta WHERE key = 'local_id_counter'", [], |row| {
                row.get::<_, String>(0)
            })
            .optional()?
            .and_then(|value| value.parse::<i32>().ok())
            .unwrap_or(0);
        let next = current - 1;
        conn.execute(
            "INSERT INTO kv_meta (key, value) VALUES ('local_id_counter', ?1)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![next.to_string()],
        )?;
        Ok(next)
    })
}

/// One queued write, as returned to the main process's sync engine.
#[napi(object)]
pub struct PendingOperation {
    pub id: i32,
    pub local_id: Option<i32>,
    pub method: String,
    pub path: String,
    pub body: Option<String>,
    pub created_at: f64,
    pub status: String,
    pub retry_count: i32,
    pub last_error: Option<String>,
}

fn read_pending_operation(row: &rusqlite::Row) -> rusqlite::Result<PendingOperation> {
    Ok(PendingOperation {
        id: row.get(0)?,
        local_id: row.get(1)?,
        method: row.get(2)?,
        path: row.get(3)?,
        body: row.get(4)?,
        created_at: row.get(5)?,
        status: row.get(6)?,
        retry_count: row.get(7)?,
        last_error: row.get(8)?,
    })
}

const PENDING_OPERATION_COLUMNS: &str =
    "id, local_id, method, path, body, created_at, status, retry_count, last_error";

/// Enqueues a write made while offline. `local_id` is set only for a
/// "create" (the negative ID allocated via `nextLocalId`); every other write
/// (update/delete/status-change) passes `None`.
#[napi]
pub fn enqueue_operation(
    method: String,
    path: String,
    body: Option<String>,
    local_id: Option<i32>,
    created_at: f64,
) -> Result<i32> {
    with_db(|conn| {
        conn.execute(
            "INSERT INTO pending_operations (local_id, method, path, body, created_at, status, retry_count)
             VALUES (?1, ?2, ?3, ?4, ?5, 'pending', 0)",
            params![local_id, method, path, body, created_at],
        )?;
        Ok(conn.last_insert_rowid() as i32)
    })
}

/// Operations ready to replay, in strict creation order (the autoincrement
/// rowid, not `created_at` — a millisecond timestamp can tie under rapid
/// successive writes, the rowid never does).
#[napi]
pub fn list_pending_operations() -> Result<Vec<PendingOperation>> {
    with_db(|conn| {
        let mut stmt = conn.prepare(&format!(
            "SELECT {PENDING_OPERATION_COLUMNS} FROM pending_operations WHERE status = 'pending' ORDER BY id ASC"
        ))?;
        let rows = stmt.query_map([], read_pending_operation)?;
        rows.collect()
    })
}

/// Operations that will never be retried by `runSync` on their own and need
/// an explicit user decision: `syncing` rows left over from a previous run
/// that never confirmed success or failure (almost always an app crash/
/// force-quit mid-request — the server may already have received them, so
/// silently retrying risks a duplicate record), and `failed` rows (the sync
/// engine stops the whole queue on the first real failure — e.g. a genuine
/// 404 for something already deleted server-side by someone else — so a
/// permanently-failing operation would otherwise jam every later queued
/// write behind it forever with no way to clear it).
#[napi]
pub fn list_stuck_operations() -> Result<Vec<PendingOperation>> {
    with_db(|conn| {
        let mut stmt = conn.prepare(&format!(
            "SELECT {PENDING_OPERATION_COLUMNS} FROM pending_operations WHERE status IN ('syncing', 'failed') ORDER BY id ASC"
        ))?;
        let rows = stmt.query_map([], read_pending_operation)?;
        rows.collect()
    })
}

/// Marks a row as in-flight, committed *before* the request is sent — the
/// half of the crash-safety design that makes a `syncing` row on next launch
/// mean "may have already reached the server", not "definitely didn't".
#[napi]
pub fn mark_operation_syncing(id: i32) -> Result<()> {
    with_db(|conn| {
        conn.execute("UPDATE pending_operations SET status = 'syncing' WHERE id = ?1", params![id])?;
        Ok(())
    })
}

/// Removes a row after it's been confirmed synced — the queue only ever
/// holds work still to do; the cache table is the durable record afterward.
#[napi]
pub fn remove_operation(id: i32) -> Result<()> {
    with_db(|conn| {
        conn.execute("DELETE FROM pending_operations WHERE id = ?1", params![id])?;
        Ok(())
    })
}

#[napi]
pub fn mark_operation_failed(id: i32, error: String) -> Result<()> {
    with_db(|conn| {
        conn.execute(
            "UPDATE pending_operations SET status = 'failed', retry_count = retry_count + 1, last_error = ?2 WHERE id = ?1",
            params![id, error],
        )?;
        Ok(())
    })
}

/// User's explicit answer to a stuck (crashed-mid-sync) operation: `retry`
/// puts it back in the normal queue; otherwise it's discarded outright.
#[napi]
pub fn resolve_stuck_operation(id: i32, retry: bool) -> Result<()> {
    with_db(|conn| {
        if retry {
            conn.execute("UPDATE pending_operations SET status = 'pending' WHERE id = ?1", params![id])?;
        } else {
            conn.execute("DELETE FROM pending_operations WHERE id = ?1", params![id])?;
        }
        Ok(())
    })
}

#[napi]
pub fn get_pending_count() -> Result<i32> {
    with_db(|conn| conn.query_row("SELECT COUNT(*) FROM pending_operations WHERE status = 'pending'", [], |row| row.get(0)))
}

/// Recursively replaces every JSON number equal to `old_id` with `new_id`.
/// Exact-value equality only, never a string/substring match — otherwise
/// `-1` could wrongly match inside `-10`.
fn remap_json_value(value: &mut serde_json::Value, old_id: i64, new_id: i64) {
    match value {
        serde_json::Value::Number(n) => {
            if n.as_i64() == Some(old_id) {
                *value = serde_json::Value::Number(serde_json::Number::from(new_id));
            }
        }
        serde_json::Value::Array(items) => {
            for item in items.iter_mut() {
                remap_json_value(item, old_id, new_id);
            }
        }
        serde_json::Value::Object(map) => {
            for value in map.values_mut() {
                remap_json_value(value, old_id, new_id);
            }
        }
        _ => {}
    }
}

/// Replaces an exact path segment (e.g. `/trips/-3/expenses` -> `/trips/501/expenses`)
/// — never a substring match within a segment.
fn remap_path_segments(path: &str, old_id: i64, new_id: i64) -> String {
    path.split('/')
        .map(|segment| {
            if segment.parse::<i64>() == Ok(old_id) {
                new_id.to_string()
            } else {
                segment.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join("/")
}

/// Called once a queued "create" syncs and the server hands back a real ID:
/// rewrites every *other* still-pending/failed operation's path and body so
/// anything referencing the old negative ID (same-entity chaining, e.g.
/// edit-after-create, or a cross-domain FK, e.g. a claim referencing a
/// locally-created trip) picks up the real one before it gets replayed.
#[napi]
pub fn remap_negative_id(old_id: i32, new_id: i32) -> Result<()> {
    let (old_id, new_id) = (old_id as i64, new_id as i64);
    with_db(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, path, body FROM pending_operations WHERE status IN ('pending', 'failed')",
        )?;
        let rows: Vec<(i32, String, Option<String>)> = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        drop(stmt);

        for (id, path, body) in rows {
            let new_path = remap_path_segments(&path, old_id, new_id);
            let new_body = match body {
                Some(raw) => match serde_json::from_str::<serde_json::Value>(&raw) {
                    Ok(mut json) => {
                        remap_json_value(&mut json, old_id, new_id);
                        Some(json.to_string())
                    }
                    // Not valid JSON (shouldn't happen — every body here was
                    // JSON.stringify()'d by apiManager.ts) — leave it as-is
                    // rather than lose data on a parse failure.
                    Err(_) => Some(raw),
                },
                None => None,
            };
            conn.execute(
                "UPDATE pending_operations SET path = ?2, body = ?3 WHERE id = ?1",
                params![id, new_path, new_body],
            )?;
        }
        Ok(())
    })
}
