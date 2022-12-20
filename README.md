# Modern-IDB

Modern [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) wrapper with Promises, AsyncIterables and strict typing.

## Motivation
IndexedDB API was available in browsers 3 years before Promises. Current event-based API is verbose and not as convenient to use in modern codebases as `async/await`.

## Changes
1. `IDBRequest<T>` has `.then()` method (except for `IDBRequest<IDBCursor | IDBCursorWithValue>`).
1. `IDBTransaction<T>` has `then()` method.
1. `.openCursor()` and `.openKeyCursor()` implement `Symbol.asyncIterator`.
1. `openDatabase()` has a generic to specify DB schema.
1. `Validate` type to validate your DB schema.
1. Automatic versioning and DB migrations with `migrations` argument of `openDatabase()`.
