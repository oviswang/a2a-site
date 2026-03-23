# Data model draft (MVP)

MVP can be fully static and require **no database**.

If/when we add dynamic features, keep the first objects minimal:

## Objects
### Release
- version (string)
- git_tag (string)
- git_commit_hash (string)
- skill_md_hash (sha256)
- signature (ed25519 b64)

### SiteConfig (optional)
- featured_version
- banner_message
- docs_links

## Storage options
- Static files on disk behind Caddy (preferred)
- Later: SQLite or KV only if we need server-side state
