# User Stories

Product requirements for Finance Management, written as user stories before any UI or backend implementation starts. This directory is the single source of truth for "what should this feature do" — implementation plans and code reference these files, not the other way around.

## Convention

- **Numbering**: `NNN-epic-name.md`, zero-padded three digits, incrementing. The next story after `001-authentication.md` is `002-...`.
- **One file per epic**: a file can bundle multiple tightly-coupled flows as separate `## Story: <name>` sections (e.g. `001-authentication.md` covers both Login and Forgot Password, since they share the same screens/fields/validation source of truth). Only split an epic into its own additional file if it stops being tightly coupled to the others.
- **Status**: every file starts with a metadata block including `Status: Draft | Ready | In Progress | Done`.
  - `Draft` — being written/reviewed, not yet ready to implement.
  - `Ready` — reviewed and approved, safe to plan implementation from.
  - `In Progress` — implementation under way.
  - `Done` — shipped.
- **Adding a new story**: copy `TEMPLATE.md` to the next `NNN-epic-name.md`, fill it in, and set `Status: Draft` until it's reviewed.

## Index

| # | File | Status |
|---|------|--------|
| 001 | [Authentication](./001-authentication.md) | Draft |
