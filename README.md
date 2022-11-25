# Modern-IDB

Modern [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) wrapper with Promises, AsyncIterables and strict typing.

## Motivation
IndexedDB API was available in browsers 3 years before Promises. Current event-based API is verbose and not as convenient to use in modern codebases as `async/await`.

## Changes
1. `IDBRequest<T>` is converted to `Promise<T>` (except for `IDBRequest<IDBCursor | IDBCursorWithValue>`)
1. `IDBTransaction<T>` is extended with a `promise: Promise<T>` property to allow simpler async/await code.
1. `.openCursor()` and `.openKeyCursor()` return an `AsyncIterable<Cursor | CursorWithValue>`
1. `openDatabase()` has a generic to specify DB schema.
1. Automatic versioning and DB migrations with `migrations` argument of `openDatabase()`
