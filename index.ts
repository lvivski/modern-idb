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
	[Symbol.asyncIterator](): AsyncIterator<T>
}
interface ObjectStore extends Wrap<IDBObjectStore> {
	add(value: any, key?: IDBValidKey): ThenableRequest<IDBValidKey>
	clear(): ThenableRequest<undefined>
	count(query?: IDBValidKey | IDBKeyRange): ThenableRequest<number>
	delete(query: IDBValidKey | IDBKeyRange): ThenableRequest<undefined>
	get(query: IDBValidKey | IDBKeyRange): ThenableRequest<any>
	getAll(
		query?: IDBValidKey | IDBKeyRange | null,
		count?: number
	): ThenableRequest<any[]>
	getAllKeys(
		query?: IDBValidKey | IDBKeyRange | null,
		count?: number
	): ThenableRequest<IDBValidKey[]>
	getKey(
		query: IDBValidKey | IDBKeyRange
	): ThenableRequest<IDBValidKey | undefined>
	openCursor(
		query?: IDBValidKey | IDBKeyRange | null,
		direction?: IDBCursorDirection
	): IterableRequest<CursorWithValue>
	openKeyCursor(
		query?: IDBValidKey | IDBKeyRange | null,
		direction?: IDBCursorDirection
	): IterableRequest<Cursor>
	put(value: any, key?: IDBValidKey): ThenableRequest<IDBValidKey>
}
interface Index extends Wrap<IDBIndex> {
	count(query?: IDBValidKey | IDBKeyRange): ThenableRequest<number>
	get(query: IDBValidKey | IDBKeyRange): ThenableRequest<any>
	getAll(
		query?: IDBValidKey | IDBKeyRange | null,
		count?: number
	): ThenableRequest<any[]>
	getAllKeys(
		query?: IDBValidKey | IDBKeyRange | null,
		count?: number
	): ThenableRequest<IDBValidKey[]>
	getKey(
		query: IDBValidKey | IDBKeyRange
	): ThenableRequest<IDBValidKey | undefined>
	openCursor(
		query?: IDBValidKey | IDBKeyRange | null,
		direction?: IDBCursorDirection
	): IterableRequest<CursorWithValue>
	openKeyCursor(
		query?: IDBValidKey | IDBKeyRange | null,
		direction?: IDBCursorDirection
	): IterableRequest<Cursor>
}
interface CursorWithValue extends Wrap<IDBCursorWithValue> {
	delete(): ThenableRequest<undefined>
	update(value: any): ThenableRequest<IDBValidKey>
}
interface Cursor extends Wrap<IDBCursor> {
	delete(): ThenableRequest<undefined>
	update(value: any): ThenableRequest<IDBValidKey>
}

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

type WrapProp<K, P> = K extends 'result'
	? P
	: P extends (...args: any[]) => infer R
	? R extends IDBRequest<infer T>
		? K extends 'openCursor'
			? ReplaceReturnType<P, IterableRequest<CursorWithValue>>
			: K extends 'openKeyCursor'
			? ReplaceReturnType<P, IterableRequest<Cursor>>
			: K extends 'add' | 'put' | 'update'
			? ReplaceReturnType<P, ThenableRequest<IDBValidKey>>
			: K extends 'getKey'
			? ReplaceReturnType<P, ThenableRequest<IDBValidKey | undefined>>
			: K extends 'getAllKeys'
			? ReplaceReturnType<P, ThenableRequest<IDBValidKey[]>>
			: ReplaceReturnType<P, ThenableRequest<Remap<T>>>
		: ReplaceReturnType<P, Remap<R>>
	: Remap<P>

type Wrap<O> = {
	[K in keyof O]: WrapProp<K, O[K]>
}

type ValidKey = number | string | Date | BufferSource

type Path<T, U extends string = ''> = T extends ValidKey
	? U
	: T extends object
	? {
			[K in keyof T]: K extends string
				? Path<T[K], U extends '' ? K : `${U}.${K}`>
				: U
	  }[keyof T]
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
	? PathTail<P> extends never
		? T[PathHead<P>] extends ValidKey
			? T[PathHead<P>]
			: never
		: T[PathHead<P>] extends ValidKey
		? never
		: T[PathHead<P>] extends object
		? PathType<T[PathHead<P>], PathTail<P>>
		: never
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

type AppendOptionalPath<
	T,
	K extends string,
	O extends string,
	S extends string
> = Exclude<T, K> extends never // the only key in the path
	? O extends ''
		? K
		: `${O}.${K}` // append key
	: `${S}${K}` // reset prefix with spacing

type OptionalPath<
	T,
	P extends string, // original path
	O extends string = '', // final optional path
	S extends string = '' // spacer path
> = PathHead<P> extends keyof T
	? PathTail<P> extends never
		? AppendOptionalPath<keyof T, PathHead<P>, O, S>
		: T[PathHead<P>] extends object
		? OptionalPath<
				T[PathHead<P>],
				PathTail<P>,
				AppendOptionalPath<keyof T, PathHead<P>, O, S>,
				`${S}.` // add one more level
		  >
		: O
	: O

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
type MaybeOptionalRecord<
	T,
	K extends keyof T,
	R extends any,
	C extends boolean
> = Omit<T, K> & (C extends true ? Partial<Record<K, R>> : Record<K, R>)

type PartialPath<
	T,
	P extends string,
	O extends string = OptionalPath<T, P>
> = PathHead<P> extends keyof T
	? PathTail<P> extends never
		? Optional<T, PathHead<P>>
		: T[PathHead<P>] extends object
		? MaybeOptionalRecord<
				T,
				PathHead<P>,
				PartialPath<T[PathHead<P>], PathTail<P>, PathTail<O>>,
				PathHead<O> extends PathHead<P> ? true : false
		  >
		: Omit<T, PathHead<P>> & Partial<Pick<T, PathHead<P>>>
	: never

type ValidStoreKey<T, A> = A extends true ? Path<T> : Path<T> | Path<T>[]

type ValidStore<T, A> = {
	key: ValidStoreKey<T, A> | null
	autoIncrement?: boolean
	value: T
	indexes: {
		[s: string]: ValidStoreKey<T, false>
	}
}

type ValidSchema<T extends ValidSchema<T>> = {
	[K in keyof T]: ValidStore<T[K]['value'], T[K]['autoIncrement']>
}

export type Validate<T extends ValidSchema<T>> = T

type Store = {
	key: string | string[] | null
	autoIncrement?: boolean
	value: any
	indexes: {
		[s: string]: string | string[]
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

type SchemaObjectStoreKeyType<
	S extends Schema,
	N extends SchemaObjectStoreName<S>
> = SchemaObjectStoreKey<S, N> extends null
	? IDBValidKey
	: KeyPathType<SchemaObjectStoreValue<S, N>, SchemaObjectStoreKey<S, N>>

type SchemaObjectStoreAutoIncrement<
	S extends Schema,
	N extends SchemaObjectStoreName<S>
> = SchemaObjectStore<S, N>['autoIncrement']

type SchemaObjectStoreValue<
	S extends Schema,
	N extends SchemaObjectStoreName<S>
> = SchemaObjectStore<S, N>['value']

type SchemaObjectStoreValuePartial<
	S extends Schema,
	N extends SchemaObjectStoreName<S>
> = SchemaObjectStoreAutoIncrement<S, N> extends true
	? SchemaObjectStoreKey<S, N> extends string
		? PartialPath<SchemaObjectStoreValue<S, N>, SchemaObjectStoreKey<S, N>>
		: SchemaObjectStoreValue<S, N>
	: SchemaObjectStoreValue<S, N>

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

type SchemaObjectStoreIndexKeyType<
	S extends Schema,
	N extends SchemaObjectStoreName<S>,
	I extends SchemaObjectStoreIndexName<S, N>
> = KeyPathType<
	SchemaObjectStoreValue<S, N>,
	SchemaObjectStoreIndexKey<S, N, I>
>

interface StrictDatabase<S extends Schema> extends Database {
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

type StrictObjectStoreInsert<
	S extends Schema,
	N extends SchemaObjectStoreName<S>
> = SchemaObjectStoreKey<S, N> extends null
	? SchemaObjectStoreAutoIncrement<S, N> extends true
		? <K extends IDBValidKey = number>(
				value: SchemaObjectStoreValue<S, N>,
				key?: K
		  ) => ThenableRequest<K>
		: <K extends IDBValidKey>(
				value: SchemaObjectStoreValue<S, N>,
				key: K
		  ) => ThenableRequest<K>
	: (
			value: SchemaObjectStoreValuePartial<S, N>
	  ) => ThenableRequest<SchemaObjectStoreKeyType<S, N>>

interface StrictObjectStore<
	S extends Schema,
	N extends SchemaObjectStoreName<S>,
	TN extends SchemaObjectStoreName<S>[]
> extends ObjectStore {
	readonly name: N extends string ? N : never
	readonly transaction: StrictTransaction<S, TN>
	index<I extends SchemaObjectStoreIndexName<S, N>>(
		name: I
	): StrictIndex<S, N, TN, I>
	add: StrictObjectStoreInsert<S, N>
	put: StrictObjectStoreInsert<S, N>
	delete(
		query: SchemaObjectStoreKeyType<S, N> | IDBKeyRange
	): ThenableRequest<undefined>
	count(
		query?: SchemaObjectStoreKeyType<S, N> | IDBKeyRange
	): ThenableRequest<number>
	get(
		query: SchemaObjectStoreKeyType<S, N> | IDBKeyRange
	): ThenableRequest<SchemaObjectStoreValue<S, N>>
	getAll(
		query?: SchemaObjectStoreKeyType<S, N> | IDBKeyRange | null,
		count?: number
	): ThenableRequest<SchemaObjectStoreValue<S, N>[]>
	getKey(
		query: SchemaObjectStoreKeyType<S, N> | IDBKeyRange
	): ThenableRequest<SchemaObjectStoreKeyType<S, N> | undefined>
	getAllKeys(
		query?: SchemaObjectStoreKeyType<S, N> | IDBKeyRange | null,
		count?: number
	): ThenableRequest<SchemaObjectStoreKeyType<S, N>[]>
	openCursor(
		query?: SchemaObjectStoreKeyType<S, N> | IDBKeyRange | null,
		direction?: IDBCursorDirection
	): IterableRequest<StrictCursorWithValue<S, N, TN>>
	openKeyCursor(
		query?: SchemaObjectStoreKeyType<S, N> | IDBKeyRange | null,
		direction?: IDBCursorDirection
	): IterableRequest<StrictCursor<S, N, TN>>
}

interface StrictIndex<
	S extends Schema,
	N extends SchemaObjectStoreName<S>,
	TN extends SchemaObjectStoreName<S>[],
	I extends SchemaObjectStoreIndexName<S, N>
> extends Index {
	readonly objectStore: StrictObjectStore<S, N, TN>
	readonly name: I extends string ? I : never
	count<K extends SchemaObjectStoreIndexKeyType<S, N, I>>(
		query?: K | IDBKeyRange
	): ThenableRequest<number>
	get<K extends SchemaObjectStoreIndexKeyType<S, N, I>>(
		query: K | IDBKeyRange
	): ThenableRequest<SchemaObjectStoreValue<S, N>>
	getAll<K extends SchemaObjectStoreIndexKeyType<S, N, I>>(
		query?: K | IDBKeyRange | null,
		count?: number
	): ThenableRequest<SchemaObjectStoreValue<S, N>[]>
	getKey<K extends SchemaObjectStoreIndexKeyType<S, N, I>>(
		query: K | IDBKeyRange
	): ThenableRequest<SchemaObjectStoreKeyType<S, N> | undefined>
	getAllKeys<K extends SchemaObjectStoreIndexKeyType<S, N, I>>(
		query?: K | IDBKeyRange | null,
		count?: number
	): ThenableRequest<SchemaObjectStoreKeyType<S, N>[]>
	openCursor<K extends SchemaObjectStoreIndexKeyType<S, N, I>>(
		range?: K | IDBKeyRange | null,
		direction?: IDBCursorDirection
	): IterableRequest<StrictCursorWithValue<S, N, TN, I>>
	openKeyCursor<K extends SchemaObjectStoreIndexKeyType<S, N, I>>(
		range?: K | IDBKeyRange | null,
		direction?: IDBCursorDirection
	): IterableRequest<StrictCursor<S, N, TN, I>>
}

interface StrictCursorWithValue<
	S extends Schema,
	N extends SchemaObjectStoreName<S>,
	TN extends SchemaObjectStoreName<S>[],
	I extends SchemaObjectStoreIndexName<S, N> | unknown = unknown
> extends CursorWithValue {
	readonly key: I extends SchemaObjectStoreIndexName<S, N>
		? SchemaObjectStoreIndexKeyType<S, N, I>
		: SchemaObjectStoreKeyType<S, N>
	readonly primaryKey: SchemaObjectStoreKeyType<S, N>
	readonly value: SchemaObjectStoreValue<S, N>
	readonly source: I extends SchemaObjectStoreIndexName<S, N>
		? StrictIndex<S, N, TN, I>
		: StrictObjectStore<S, N, TN>
	update(
		value: SchemaObjectStoreValue<S, N>
	): ThenableRequest<SchemaObjectStoreKeyType<S, N>>
}

interface StrictCursor<
	S extends Schema,
	N extends SchemaObjectStoreName<S>,
	TN extends SchemaObjectStoreName<S>[],
	I extends SchemaObjectStoreIndexName<S, N> | unknown = unknown
> extends Cursor {
	readonly key: I extends SchemaObjectStoreIndexName<S, N>
		? SchemaObjectStoreIndexKeyType<S, N, I>
		: SchemaObjectStoreKeyType<S, N>
	readonly primaryKey: SchemaObjectStoreKeyType<S, N>
	readonly source: I extends SchemaObjectStoreIndexName<S, N>
		? StrictIndex<S, N, TN, I>
		: StrictObjectStore<S, N, TN>
	update(
		value: SchemaObjectStoreValue<S, N>
	): ThenableRequest<SchemaObjectStoreKeyType<S, N>>
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

	return wrap(request) as ThenableRequest<DB>
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
	return wrap(request) as ThenableRequest<undefined>
}

const wrapMap = new WeakMap()
const inverseWrapMap = new WeakMap()

function wrap(value: IDBOpenDBRequest): ThenableRequest<Database | undefined>
function wrap<T>(value: IDBRequest<T>): ThenableRequest<Wrap<T>>
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
