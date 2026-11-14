# Backlog

## Reliability

- Bound and evict inactive client buckets in the in-memory rate limiter. Each
  caller-controlled UUID currently creates a bucket that is retained for the
  lifetime of the process.
- Validate the stored anonymous client UUID and regenerate it when malformed
  (or when the API rejects it), so a corrupted local-storage value does not
  leave the workspace unusable.
