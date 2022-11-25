interface Database extends Wrap<IDBDatabase> {}
interface Transaction extends Wrap<IDBTransaction> {
  promise: Promise<any>
}
interface ObjectStore extends Wrap<IDBObjectStore> {}
interface Index extends Wrap<IDBIndex> {}
interface CursorWithValue extends Wrap<IDBCursorWithValue> {}
interface Cursor extends Wrap<IDBCursor> {}

type AnyFunction = (...args: any[]) => any
type ReplaceReturnType<F extends AnyFunction, R> = (...args: Parameters<F>) => R
type Map<T> = T extends IDBDatabase
  ? Database
  : T extends IDBTransaction
  ? Transaction
  : T extends IDBObjectStore
  ? ObjectStore
  : T extends IDBIndex
  ? Index
  : T extends IDBObjectStore | IDBIndex
  ? ObjectStore | Index
  : T extends IDBCursorWithValue
  ? CursorWithValue
  : T extends IDBCursor
  ? Cursor
  : T

type Wrap<O> = {
  [K in keyof O]: O[K] extends (...args: any[]) => infer R
    ? R extends IDBRequest<infer T>
      ? T extends IDBCursorWithValue | null
        ? ReplaceReturnType<O[K], AsyncIterable<CursorWithValue>>
        : T extends IDBCursor | null
        ? ReplaceReturnType<O[K], AsyncIterable<Cursor>>
        : T extends IDBValidKey | undefined
        ? ReplaceReturnType<O[K], Promise<IDBValidKey | undefined>>
        : ReplaceReturnType<O[K], Promise<Map<T>>>
      : ReplaceReturnType<O[K], Map<R>>
    : Map<O[K]>
}

type Schema = {
  [name: string]: {
    key: IDBValidKey
    value: any
    indexes: {
      [s: string]: IDBValidKey
    }
  }
}

type SchemaObjectStoreName<S extends Schema> = keyof S

type SchemaObjectStore<
  S extends Schema,
  N extends SchemaObjectStoreName<S> = SchemaObjectStoreName<S>
> = S[N]

type SchemaObjectStoreKey<
  S extends Schema,
  N extends SchemaObjectStoreName<S>
> = SchemaObjectStore<S, N>['key']

type SchemaObjectStoreValue<
  S extends Schema,
  N extends SchemaObjectStoreName<S>
> = SchemaObjectStore<S, N>['value']

type SchemaObjectStoreIndex<
  S extends Schema,
  N extends SchemaObjectStoreName<S>
> = SchemaObjectStore<S, N>['indexes']

type SchemaObjectStoreIndexName<
  S extends Schema,
  N extends SchemaObjectStoreName<S>
> = keyof SchemaObjectStoreIndex<S, N>

type SchemaObjectStoreIndexKey<
  S extends Schema,
  N extends SchemaObjectStoreName<S>,
  I extends SchemaObjectStoreIndexName<S, N>
> = SchemaObjectStoreIndex<S, N>[I]

interface StrictDatabase<S extends Schema> extends Database {
  createObjectStore<N extends SchemaObjectStoreName<S>>(
    name: N,
    options?: IDBObjectStoreParameters
  ): StrictObjectStore<S, N>
  deleteObjectStore<N extends SchemaObjectStoreName<S>>(name: N): void
  transaction<N extends SchemaObjectStoreName<S>>(
    storeNames: N,
    mode?: IDBTransactionMode
  ): StrictTransaction<S, [N]>
  transaction<NN extends SchemaObjectStoreName<S>[]>(
    storeNames: NN,
    mode?: IDBTransactionMode
  ): StrictTransaction<S, NN>
}

interface StrictTransaction<
  S extends Schema,
  NN extends SchemaObjectStoreName<S>[]
> extends Transaction {
  readonly db: StrictDatabase<S>
  objectStore<N extends NN[number]>(name: N): StrictObjectStore<S, N>
}

interface StrictObjectStore<
  S extends Schema,
  N extends SchemaObjectStoreName<S>
> extends ObjectStore {
  readonly name: N extends string ? N : never
  index<I extends SchemaObjectStoreIndexName<S, N>>(
    name: I
  ): StrictIndex<S, N, I>
  add(
    value: SchemaObjectStoreValue<S, N>,
    key?: SchemaObjectStoreKey<S, N>
  ): Promise<SchemaObjectStoreKey<S, N>>
  put(
    value: SchemaObjectStoreValue<S, N>,
    key?: SchemaObjectStoreKey<S, N>
  ): Promise<SchemaObjectStoreKey<S, N>>
  delete(query: SchemaObjectStoreKey<S, N> | IDBKeyRange): Promise<undefined>
  count(query?: SchemaObjectStoreKey<S, N> | IDBKeyRange): Promise<number>
  get(
    query: SchemaObjectStoreKey<S, N> | IDBKeyRange
  ): Promise<SchemaObjectStoreValue<S, N>>
  getAll(
    query?: SchemaObjectStoreKey<S, N> | IDBKeyRange | null,
    count?: number
  ): Promise<SchemaObjectStoreValue<S, N>[]>
  getKey(
    query: SchemaObjectStoreKey<S, N> | IDBKeyRange
  ): Promise<SchemaObjectStoreKey<S, N> | undefined>
  getAllKeys(
    query?: SchemaObjectStoreKey<S, N> | IDBKeyRange | null,
    count?: number
  ): Promise<SchemaObjectStoreKey<S, N>[]>
  createIndex<I extends SchemaObjectStoreIndexName<S, N>>(
    name: I,
    keyPath: string | Iterable<string>,
    options?: IDBIndexParameters
  ): StrictIndex<S, N, I>
  deleteIndex<I extends SchemaObjectStoreIndexName<S, N>>(name: I): void
  openCursor(
    query?: SchemaObjectStoreKey<S, N> | IDBKeyRange | null,
    direction?: IDBCursorDirection
  ): AsyncIterable<StrictCursorWithValue<S, N>>
  openKeyCursor(
    query?: SchemaObjectStoreKey<S, N> | IDBKeyRange | null,
    direction?: IDBCursorDirection
  ): AsyncIterable<StrictCursor<S, N>>
}

interface StrictIndex<
  S extends Schema,
  N extends SchemaObjectStoreName<S>,
  I extends SchemaObjectStoreIndexName<S, N>
> extends Index {
  readonly objectStore: StrictObjectStore<S, N>
  readonly name: I extends string ? I : never
  count<K = SchemaObjectStoreIndexKey<S, N, I>>(
    query?: K | IDBKeyRange
  ): Promise<number>
  get<K = SchemaObjectStoreIndexKey<S, N, I>>(
    query: K | IDBKeyRange
  ): Promise<SchemaObjectStoreValue<S, N>>
  getAll<K = SchemaObjectStoreIndexKey<S, N, I>>(
    query?: K | IDBKeyRange | null,
    count?: number
  ): Promise<SchemaObjectStoreValue<S, N>[]>
  getKey<K = SchemaObjectStoreIndexKey<S, N, I>>(
    query: K | IDBKeyRange
  ): Promise<SchemaObjectStoreKey<S, N> | undefined>
  getAllKeys<K = SchemaObjectStoreIndexKey<S, N, I>>(
    query?: K | IDBKeyRange | null,
    count?: number
  ): Promise<SchemaObjectStoreKey<S, N>[]>
  openCursor<K = SchemaObjectStoreIndexKey<S, N, I>>(
    range?: K | IDBKeyRange | null,
    direction?: IDBCursorDirection
  ): AsyncIterable<StrictCursorWithValue<S, N, I>>
  openKeyCursor<K = SchemaObjectStoreIndexKey<S, N, I>>(
    range?: K | IDBKeyRange | null,
    direction?: IDBCursorDirection
  ): AsyncIterable<StrictCursor<S, N, I>>
}

interface StrictCursorWithValue<
  S extends Schema,
  N extends SchemaObjectStoreName<S>,
  I extends SchemaObjectStoreIndexName<S, N> | unknown = unknown
> extends CursorWithValue {
  readonly value: SchemaObjectStoreValue<S, N>
  readonly source: I extends SchemaObjectStoreIndexName<S, N>
    ? StrictIndex<S, N, I>
    : StrictObjectStore<S, N>
  update(
    value: SchemaObjectStoreValue<S, N>
  ): Promise<SchemaObjectStoreKey<S, N>>
}

interface StrictCursor<
  S extends Schema,
  N extends SchemaObjectStoreName<S>,
  I extends SchemaObjectStoreIndexName<S, N> | unknown = unknown
> extends Cursor {
  readonly source: I extends SchemaObjectStoreIndexName<S, N>
    ? StrictIndex<S, N, I>
    : StrictObjectStore<S, N>
  update(
    value: SchemaObjectStoreValue<S, N>
  ): Promise<SchemaObjectStoreKey<S, N>>
}

type Migration = (tx: Transaction) => void | Promise<void>

export function openDatabase<
  S extends Schema | unknown = unknown,
  DB = S extends Schema ? StrictDatabase<S> : Database
>(
  name: string,
  migrations?: Migration[],
  blockedCallback?: (oldVersion: number, newVersion: number | null) => void
) {
  const request = indexedDB.open(name, migrations?.length || undefined)

  request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
    const tx = wrap(request.transaction) as Transaction
    if (migrations) {
      const oldVersion = event.oldVersion
      for (const migrate of migrations.slice(oldVersion)) {
        migrate(tx)
      }
    }
  }

  if (blockedCallback) {
    request.onblocked = (e: Event) => {
      const event = e as IDBVersionChangeEvent
      blockedCallback(event.oldVersion, event.newVersion)
    }
  }

  return wrap(request) as unknown as Promise<DB>
}

export function deleteDatabase(
  name: string,
  blockedCallback?: (oldVersion: number, newVersion: number | null) => void
) {
  const request = indexedDB.deleteDatabase(name)
  if (blockedCallback) {
    request.onblocked = (e: Event) => {
      const event = e as IDBVersionChangeEvent
      blockedCallback(event.oldVersion, event.newVersion)
    }
  }
  return wrap(request) as Promise<undefined>
}

const wrapMap = new WeakMap()
const inverseWrapMap = new WeakMap()

function wrap(value: IDBOpenDBRequest): Promise<Database | undefined>
function wrap<T>(value: IDBRequest<T>): Promise<Wrap<T>>
function wrap<T>(value: T): Wrap<T>
function wrap(value: any): any {
  if (wrapMap.has(value)) {
    return wrapMap.get(value)
  }
  const newValue = wrapValue(value)

  if (newValue !== value) {
    if (!(value instanceof IDBRequest)) {
      wrapMap.set(value, newValue)
    }
    inverseWrapMap.set(newValue, value)
  }

  return newValue
}

const transactionPromiseMap = new WeakMap()

const proxyTargets = [
  IDBDatabase,
  IDBTransaction,
  IDBObjectStore,
  IDBIndex,
  IDBCursor,
]

const proxyHandler: ProxyHandler<any> = {
  get(target, prop) {
    if (prop === 'promise' && target instanceof IDBTransaction) {
      return transactionPromiseMap.get(target)
    }
    return wrap(target[prop])
  },

  set(target, prop, value) {
    target[prop] = value
    return true
  },

  has(target, prop) {
    if (prop === 'promise' && target instanceof IDBTransaction) {
      return true
    }
    return prop in target
  },
}

function wrapValue(value: any): any {
  if (value instanceof IDBRequest) {
    return wrapRequest(value)
  }

  if (typeof value === 'function') {
    return wrapFunction(value)
  }

  if (proxyTargets.some(type => value instanceof type)) {
    if (value instanceof IDBTransaction) {
      value = wrapTransaction(value)
    }
    return new Proxy(value, proxyHandler)
  }

  return value
}

function wrapRequest<T>(input: IDBRequest<T>): Promise<Wrap<T>> {
  const controller = new AbortController()
  const options = { once: true, signal: controller.signal }

  return new Promise<Wrap<T>>((resolve, reject) => {
    if (input instanceof IDBRequest) {
      function success() {
        resolve(wrap(input.result))
        controller.abort()
      }
      function error() {
        reject(input.error)
        controller.abort()
      }
      input.addEventListener('success', success, options)
      input.addEventListener('error', error, options)
    } else {
      resolve(input)
    }
  })
}

function wrapCursorRequest<T extends IDBCursor>(
  value: IDBRequest<T>
): AsyncIterable<Wrap<T>> {
  let promise = wrapRequest(value)
  return {
    [Symbol.asyncIterator]() {
      return {
        next() {
          return promise.then(cursor => {
            if (cursor) {
              promise = wrapRequest(value)
              return { value: cursor, done: false }
            }
            return { value: undefined, done: true }
          })
        },
      }
    },
  }
}

function wrapTransaction(value: IDBTransaction): IDBTransaction {
  const controller = new AbortController()
  const options = { once: true, signal: controller.signal }

  const promise = new Promise<void>((resolve, reject) => {
    if (value instanceof IDBTransaction) {
      function complete() {
        resolve()
        controller.abort()
      }
      function error() {
        reject(value.error)
        controller.abort()
      }
      value.addEventListener('complete', complete, options)
      value.addEventListener('error', error, options)
      value.addEventListener('abort', error, options)
    } else {
      resolve()
    }
  })

  transactionPromiseMap.set(value, promise)

  return value
}

const cursorReturnMethods = [
  IDBObjectStore.prototype.openCursor,
  IDBObjectStore.prototype.openKeyCursor,
  IDBIndex.prototype.openCursor,
  IDBIndex.prototype.openKeyCursor,
]

function wrapFunction<T extends AnyFunction>(value: T) {
  return function (this: any, ...args: Parameters<T>) {
    const originalThis = inverseWrapMap.get(this) || this
    const result = value.apply(originalThis, args)

    if (cursorReturnMethods.includes(value)) {
      return wrapCursorRequest(result)
    }

    return wrap(result)
  }
}
