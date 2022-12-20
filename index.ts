interface Database extends Wrap<IDBDatabase> {}
interface Transaction extends Wrap<IDBTransaction> {
	then<U>(
		onFulfilled?: (value: any) => U | PromiseLike<U>,
		onRejected?: (reason: any) => U | PromiseLike<U>
	): Promise<U>
}
interface ThenableRequest<T> extends Wrap<IDBRequest<T>> {
	then<U>(
		onFulfilled?: (value: T) => U | PromiseLike<U>,
		onRejected?: (reason: any) => U | PromiseLike<U>
	): Promise<U>
}
interface IterableRequest<T> extends Wrap<IDBRequest<T>> {
	[Symbol.asyncIterator](): AsyncIterator<Wrap<T>>
}
interface ObjectStore extends Wrap<IDBObjectStore> {}
interface Index extends Wrap<IDBIndex> {}
interface CursorWithValue extends Wrap<IDBCursorWithValue> {}
interface Cursor extends Wrap<IDBCursor> {}

type AnyFunction = (...args: any[]) => any
type ReplaceReturnType<F extends AnyFunction, R> = (...args: Parameters<F>) => R
type Remap<T> = T extends IDBDatabase
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
type WrapProp<P> = P extends (...args: any[]) => infer R
	? R extends IDBRequest<infer T>
		? T extends IDBCursorWithValue | null
			? ReplaceReturnType<P, IterableRequest<CursorWithValue>>
			: T extends IDBCursor | null
			? ReplaceReturnType<P, IterableRequest<Cursor>>
			: T extends IDBValidKey | undefined
			? ReplaceReturnType<P, ThenableRequest<IDBValidKey | undefined>>
			: ReplaceReturnType<P, ThenableRequest<Remap<T>>>
		: ReplaceReturnType<P, Remap<R>>
	: Remap<P>

type Wrap<O> = {
	[K in keyof O]: WrapProp<O[K]>
}

type ValidKey = number | string | Date | BufferSource

type Path<T, U extends string = ''> = T extends object
	? {
			[K in keyof T]: K extends string
				? Path<T[K], U extends '' ? K : `${U}.${K}`>
				: U
	  }[keyof T]
	: T extends ValidKey
	? U
	: never

type SplitPath<T extends string> = T extends `${infer L}.${infer R}`
	? [L, ...SplitPath<R>]
	: [T]

type PathHead<T> = T extends ''
	? never
	: T extends `${infer H}.${string}`
	? H
	: T extends `${infer H}`
	? H
	: never
type PathTail<T> = T extends `${string}.${infer R}` ? R : never
type PathType<T, P extends string> = PathHead<P> extends keyof T
	? T[PathHead<P>] extends object
		? PathTail<P> extends never
			? never
			: PathType<T[PathHead<P>], PathTail<P>>
		: T[PathHead<P>]
	: never

type ArrayHead<T extends any[]> = T extends [] ? never : T[0]
type ArrayTail<T extends any[]> = T extends [any]
	? never
	: T extends [any, ...infer U]
	? U
	: never
type ArrayPathType<
	O,
	T extends any[],
	U extends any[] = []
> = ArrayHead<T> extends never
	? U
	: ArrayPathType<O, ArrayTail<T>, [...U, PathType<O, T[0]>]>

type KeyPathType<T, K> = K extends string
	? PathType<T, K>
	: K extends string[]
	? ArrayPathType<T, K>
	: never

type ValidStore<T> = {
	key: Path<T> | Path<T>[]
	value: T
	indexes?: {
		[s: string]: Path<T> | Path<T>[]
	}
}

type ValidSchema<T extends ValidSchema<T> = ValidSchema<any>> = {
	[K in keyof T]: ValidStore<T[K]['value']>
}

type ValidSchemaKey = string | string[]
type ValidSchemaIndexes =
	| {
			[s: string]: string | string[]
	  }
	| undefined

type RemappedStore<
	T,
	K extends ValidSchemaKey,
	I extends ValidSchemaIndexes
> = {
	key: KeyPathType<T, K>
	value: T
	indexes: I extends object
		? {
				[K in keyof I]: KeyPathType<T, I[K]>
		  }
		: undefined
}

type RemappedSchema<T extends ValidSchema<T>> = {
	[K in keyof T]: RemappedStore<T[K]['value'], T[K]['key'], T[K]['indexes']>
}

export type Validate<T extends ValidSchema<T>> = RemappedSchema<T>

type Store = {
	key: IDBValidKey
	value: any
	indexes: {
		[s: string]: IDBValidKey
	}
}

type Schema = {
	[name: string]: Store
}

type SchemaObjectStoreName<S extends Schema> = keyof S

type SchemaObjectStore<
	S extends Schema,
	N extends SchemaObjectStoreName<S>
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
	): StrictObjectStore<S, N, N[]>
	deleteObjectStore<N extends SchemaObjectStoreName<S>>(name: N): void
	transaction<TN extends SchemaObjectStoreName<S>>(
		storeNames: TN,
		mode?: IDBTransactionMode
	): StrictTransaction<S, [TN]>
	transaction<TN extends SchemaObjectStoreName<S>[]>(
		storeNames: TN,
		mode?: IDBTransactionMode
	): StrictTransaction<S, TN>
}

interface StrictTransaction<
	S extends Schema,
	TN extends SchemaObjectStoreName<S>[]
> extends Transaction {
	readonly db: StrictDatabase<S>
	objectStore<N extends TN[number]>(name: N): StrictObjectStore<S, N, TN>
}

interface StrictObjectStore<
	S extends Schema,
	N extends SchemaObjectStoreName<S>,
	TN extends SchemaObjectStoreName<S>[]
> extends ObjectStore {
	readonly name: N extends string ? N : never
	index<I extends SchemaObjectStoreIndexName<S, N>>(
		name: I
	): StrictIndex<S, N, TN, I>
	add(
		value: SchemaObjectStoreValue<S, N>,
		key?: SchemaObjectStoreKey<S, N>
	): StrictThenableRequest<S, N, TN, SchemaObjectStoreKey<S, N>>
	put(
		value: SchemaObjectStoreValue<S, N>,
		key?: SchemaObjectStoreKey<S, N>
	): StrictThenableRequest<S, N, TN, SchemaObjectStoreKey<S, N>>
	delete(
		query: SchemaObjectStoreKey<S, N> | IDBKeyRange
	): StrictThenableRequest<S, N, TN, undefined>
	count(
		query?: SchemaObjectStoreKey<S, N> | IDBKeyRange
	): StrictThenableRequest<S, N, TN, number>
	get(
		query: SchemaObjectStoreKey<S, N> | IDBKeyRange
	): StrictThenableRequest<S, N, TN, SchemaObjectStoreValue<S, N>>
	getAll(
		query?: SchemaObjectStoreKey<S, N> | IDBKeyRange | null,
		count?: number
	): StrictThenableRequest<S, N, TN, SchemaObjectStoreValue<S, N>[]>
	getKey(
		query: SchemaObjectStoreKey<S, N> | IDBKeyRange
	): StrictThenableRequest<S, N, TN, SchemaObjectStoreKey<S, N> | undefined>
	getAllKeys(
		query?: SchemaObjectStoreKey<S, N> | IDBKeyRange | null,
		count?: number
	): StrictThenableRequest<S, N, TN, SchemaObjectStoreKey<S, N>[]>
	createIndex<I extends SchemaObjectStoreIndexName<S, N>>(
		name: I,
		keyPath: string | Iterable<string>,
		options?: IDBIndexParameters
	): StrictIndex<S, N, TN, I>
	deleteIndex<I extends SchemaObjectStoreIndexName<S, N>>(name: I): void
	openCursor(
		query?: SchemaObjectStoreKey<S, N> | IDBKeyRange | null,
		direction?: IDBCursorDirection
	): StrictIterableRequest<S, N, TN, StrictCursorWithValue<S, N, TN>>
	openKeyCursor(
		query?: SchemaObjectStoreKey<S, N> | IDBKeyRange | null,
		direction?: IDBCursorDirection
	): StrictIterableRequest<S, N, TN, StrictCursor<S, N, TN>>
}

interface StrictIterableRequest<
	S extends Schema,
	N extends SchemaObjectStoreName<S>,
	TN extends SchemaObjectStoreName<S>[],
	T
> extends IterableRequest<T> {
	transaction: StrictTransaction<S, TN>
}

interface StrictThenableRequest<
	S extends Schema,
	N extends SchemaObjectStoreName<S>,
	TN extends SchemaObjectStoreName<S>[],
	T
> extends ThenableRequest<T> {
	transaction: StrictTransaction<S, TN>
}

interface StrictIndex<
	S extends Schema,
	N extends SchemaObjectStoreName<S>,
	TN extends SchemaObjectStoreName<S>[],
	I extends SchemaObjectStoreIndexName<S, N>
> extends Index {
	readonly objectStore: StrictObjectStore<S, N, TN>
	readonly name: I extends string ? I : never
	count<K = SchemaObjectStoreIndexKey<S, N, I>>(
		query?: K | IDBKeyRange
	): ThenableRequest<number>
	get<K = SchemaObjectStoreIndexKey<S, N, I>>(
		query: K | IDBKeyRange
	): ThenableRequest<SchemaObjectStoreValue<S, N>>
	getAll<K = SchemaObjectStoreIndexKey<S, N, I>>(
		query?: K | IDBKeyRange | null,
		count?: number
	): ThenableRequest<SchemaObjectStoreValue<S, N>[]>
	getKey<K = SchemaObjectStoreIndexKey<S, N, I>>(
		query: K | IDBKeyRange
	): ThenableRequest<SchemaObjectStoreKey<S, N> | undefined>
	getAllKeys<K = SchemaObjectStoreIndexKey<S, N, I>>(
		query?: K | IDBKeyRange | null,
		count?: number
	): ThenableRequest<SchemaObjectStoreKey<S, N>[]>
	openCursor<K = SchemaObjectStoreIndexKey<S, N, I>>(
		range?: K | IDBKeyRange | null,
		direction?: IDBCursorDirection
	): StrictIterableRequest<S, N, TN, StrictCursorWithValue<S, N, TN, I>>
	openKeyCursor<K = SchemaObjectStoreIndexKey<S, N, I>>(
		range?: K | IDBKeyRange | null,
		direction?: IDBCursorDirection
	): StrictIterableRequest<S, N, TN, StrictCursor<S, N, TN, I>>
}

interface StrictCursorWithValue<
	S extends Schema,
	N extends SchemaObjectStoreName<S>,
	TN extends SchemaObjectStoreName<S>[],
	I extends SchemaObjectStoreIndexName<S, N> | unknown = unknown
> extends CursorWithValue {
	readonly key: I extends SchemaObjectStoreIndexName<S, N>
		? SchemaObjectStoreIndexKey<S, N, I>
		: SchemaObjectStoreKey<S, N>
	readonly primaryKey: SchemaObjectStoreKey<S, N>
	readonly value: SchemaObjectStoreValue<S, N>
	readonly source: I extends SchemaObjectStoreIndexName<S, N>
		? StrictIndex<S, N, TN, I>
		: StrictObjectStore<S, N, TN>
	update(
		value: SchemaObjectStoreValue<S, N>
	): StrictThenableRequest<S, N, TN, SchemaObjectStoreKey<S, N>>
}

interface StrictCursor<
	S extends Schema,
	N extends SchemaObjectStoreName<S>,
	TN extends SchemaObjectStoreName<S>[],
	I extends SchemaObjectStoreIndexName<S, N> | unknown = unknown
> extends Cursor {
	readonly key: I extends SchemaObjectStoreIndexName<S, N>
		? SchemaObjectStoreIndexKey<S, N, I>
		: SchemaObjectStoreKey<S, N>
	readonly primaryKey: SchemaObjectStoreKey<S, N>
	readonly source: I extends SchemaObjectStoreIndexName<S, N>
		? StrictIndex<S, N, TN, I>
		: StrictObjectStore<S, N, TN>
	update(
		value: SchemaObjectStoreValue<S, N>
	): StrictThenableRequest<S, N, TN, SchemaObjectStoreKey<S, N>>
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
		wrapMap.set(value, newValue)
		inverseWrapMap.set(newValue, value)
	}

	return newValue
}

const proxyTargets = [
	IDBDatabase,
	IDBTransaction,
	IDBObjectStore,
	IDBRequest,
	IDBIndex,
	IDBCursor,
]

const then = 'then'
const proxyHandler: ProxyHandler<any> = {
	get(target, prop) {
		if ((prop === then || prop === Symbol.asyncIterator) && prop in target) {
			return target[prop]
		}
		return wrap(target[prop])
	},

	set(target, prop, value) {
		target[prop] = value
		return true
	},

	has(target, prop) {
		return prop in target
	},
}

const cursorRequest = Symbol('cursor')

function wrapValue(value: any): any {
	if (typeof value === 'function') {
		return wrapFunction(value)
	}

	if (proxyTargets.some(type => value instanceof type)) {
		if (value instanceof IDBRequest) {
			if (cursorRequest in value) {
				value = wrapCursorRequest(value)
			} else {
				value = wrapRequest(value)
			}
		}

		if (value instanceof IDBTransaction) {
			value = wrapTransaction(value)
		}

		return new Proxy(value, proxyHandler)
	}

	return value
}

function wrapRequest<T>(input: IDBRequest<T>): ThenableRequest<Wrap<T>> {
	const promise = requestPromise(input)

	return Object.defineProperty(input as any, then, {
		value(
			onfulfilled: (value: Wrap<T>) => Wrap<T>,
			onrejected: (reason: any) => any
		) {
			return promise.then(onfulfilled, onrejected)
		},
	})
}

function wrapCursorRequest<T extends IDBCursor>(
	value: IDBRequest<T>
): IterableRequest<Wrap<T>> {
	let promise = requestPromise(value)

	return Object.defineProperty(value as any, Symbol.asyncIterator, {
		value() {
			return {
				next() {
					return promise.then(cursor => {
						if (cursor) {
							promise = requestPromise(value)
							return { value: cursor, done: false }
						}
						return { value: undefined, done: true }
					})
				},
			}
		},
	})
}

function requestPromise<T>(input: IDBRequest<T>): Promise<Wrap<T>> {
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

function wrapTransaction(value: IDBTransaction): Transaction {
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

	return Object.defineProperty(value as any, then, {
		value(onfulfilled: (value: any) => any, onrejected: (reason: any) => any) {
			return promise.then(onfulfilled, onrejected)
		},
	})
}

const cursorRequestMethods = [
	IDBObjectStore.prototype.openCursor,
	IDBObjectStore.prototype.openKeyCursor,
	IDBIndex.prototype.openCursor,
	IDBIndex.prototype.openKeyCursor,
]

function wrapFunction<T extends AnyFunction>(value: T) {
	return function (this: any, ...args: Parameters<T>) {
		const originalThis = inverseWrapMap.get(this) || this
		const result = value.apply(originalThis, args)

		if (cursorRequestMethods.includes(value)) {
			Object.defineProperty(result, cursorRequest, { value: true })
		}

		return wrap(result)
	}
}
