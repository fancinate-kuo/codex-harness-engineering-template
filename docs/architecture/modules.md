# Modules

Example modules:

- forum
- identity
- moderation
- notification
- reference (executable template module)

## Forum / Sora

The first Sora vertical slice is read-only article discovery. The forum module
owns the published article model, its public contracts, the filesystem seed
repository, and the `/forum/articles` API. The Control Plane keeps `/` as its
management entry while hosting Sora at `/forum` and `/forum/articles/:slug`.

Authentication, bookmarks, follows, replies, and PostgreSQL persistence are
outside this slice. The repository boundary is intentionally ready for a
future durable adapter.

Add one section per real business capability.
