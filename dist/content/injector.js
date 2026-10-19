(function() {
	//#region \0rolldown/runtime.js
	var __create = Object.create;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod, mod.exports), cb = null), mod.exports);
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
			key = keys[i];
			if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: ((k) => from[k]).bind(null, key),
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));
	//#endregion
	//#region node_modules/minisearch/dist/es/index.js
	/** @ignore */
	var ENTRIES = "ENTRIES";
	/** @ignore */
	var KEYS = "KEYS";
	/** @ignore */
	var VALUES = "VALUES";
	/** @ignore */
	var LEAF = "";
	/**
	* @private
	*/
	var TreeIterator = class {
		constructor(set, type) {
			const node = set._tree;
			const keys = Array.from(node.keys());
			this.set = set;
			this._type = type;
			this._path = keys.length > 0 ? [{
				node,
				keys
			}] : [];
		}
		next() {
			const value = this.dive();
			this.backtrack();
			return value;
		}
		dive() {
			if (this._path.length === 0) return {
				done: true,
				value: void 0
			};
			const { node, keys } = last$1(this._path);
			if (last$1(keys) === LEAF) return {
				done: false,
				value: this.result()
			};
			const child = node.get(last$1(keys));
			this._path.push({
				node: child,
				keys: Array.from(child.keys())
			});
			return this.dive();
		}
		backtrack() {
			if (this._path.length === 0) return;
			const keys = last$1(this._path).keys;
			keys.pop();
			if (keys.length > 0) return;
			this._path.pop();
			this.backtrack();
		}
		key() {
			return this.set._prefix + this._path.map(({ keys }) => last$1(keys)).filter((key) => key !== LEAF).join("");
		}
		value() {
			return last$1(this._path).node.get(LEAF);
		}
		result() {
			switch (this._type) {
				case VALUES: return this.value();
				case KEYS: return this.key();
				default: return [this.key(), this.value()];
			}
		}
		[Symbol.iterator]() {
			return this;
		}
	};
	var last$1 = (array) => {
		return array[array.length - 1];
	};
	/**
	* @ignore
	*/
	var fuzzySearch = (node, query, maxDistance) => {
		const results = /* @__PURE__ */ new Map();
		if (query === void 0) return results;
		const n = query.length + 1;
		const m = n + maxDistance;
		const matrix = new Uint8Array(m * n).fill(maxDistance + 1);
		for (let j = 0; j < n; ++j) matrix[j] = j;
		for (let i = 1; i < m; ++i) matrix[i * n] = i;
		recurse(node, query, maxDistance, results, matrix, 1, n, "");
		return results;
	};
	var recurse = (node, query, maxDistance, results, matrix, m, n, prefix) => {
		const offset = m * n;
		key: for (const key of node.keys()) if (key === LEAF) {
			const distance = matrix[offset - 1];
			if (distance <= maxDistance) results.set(prefix, [node.get(key), distance]);
		} else {
			let i = m;
			for (let pos = 0; pos < key.length; ++pos, ++i) {
				const char = key[pos];
				const thisRowOffset = n * i;
				const prevRowOffset = thisRowOffset - n;
				let minDistance = matrix[thisRowOffset];
				const jmin = Math.max(0, i - maxDistance - 1);
				const jmax = Math.min(n - 1, i + maxDistance);
				for (let j = jmin; j < jmax; ++j) {
					const different = char !== query[j];
					const rpl = matrix[prevRowOffset + j] + +different;
					const del = matrix[prevRowOffset + j + 1] + 1;
					const ins = matrix[thisRowOffset + j] + 1;
					const dist = matrix[thisRowOffset + j + 1] = Math.min(rpl, del, ins);
					if (dist < minDistance) minDistance = dist;
				}
				if (minDistance > maxDistance) continue key;
			}
			recurse(node.get(key), query, maxDistance, results, matrix, i, n, prefix + key);
		}
	};
	/**
	* A class implementing the same interface as a standard JavaScript
	* [`Map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)
	* with string keys, but adding support for efficiently searching entries with
	* prefix or fuzzy search. This class is used internally by {@link MiniSearch}
	* as the inverted index data structure. The implementation is a radix tree
	* (compressed prefix tree).
	*
	* Since this class can be of general utility beyond _MiniSearch_, it is
	* exported by the `minisearch` package and can be imported (or required) as
	* `minisearch/SearchableMap`.
	*
	* @typeParam T  The type of the values stored in the map.
	*/
	var SearchableMap = class SearchableMap {
		/**
		* The constructor is normally called without arguments, creating an empty
		* map. In order to create a {@link SearchableMap} from an iterable or from an
		* object, check {@link SearchableMap.from} and {@link
		* SearchableMap.fromObject}.
		*
		* The constructor arguments are for internal use, when creating derived
		* mutable views of a map at a prefix.
		*/
		constructor(tree = /* @__PURE__ */ new Map(), prefix = "") {
			this._size = void 0;
			this._tree = tree;
			this._prefix = prefix;
		}
		/**
		* Creates and returns a mutable view of this {@link SearchableMap},
		* containing only entries that share the given prefix.
		*
		* ### Usage:
		*
		* ```javascript
		* let map = new SearchableMap()
		* map.set("unicorn", 1)
		* map.set("universe", 2)
		* map.set("university", 3)
		* map.set("unique", 4)
		* map.set("hello", 5)
		*
		* let uni = map.atPrefix("uni")
		* uni.get("unique") // => 4
		* uni.get("unicorn") // => 1
		* uni.get("hello") // => undefined
		*
		* let univer = map.atPrefix("univer")
		* univer.get("unique") // => undefined
		* univer.get("universe") // => 2
		* univer.get("university") // => 3
		* ```
		*
		* @param prefix  The prefix
		* @return A {@link SearchableMap} representing a mutable view of the original
		* Map at the given prefix
		*/
		atPrefix(prefix) {
			if (!prefix.startsWith(this._prefix)) throw new Error("Mismatched prefix");
			const [node, path] = trackDown(this._tree, prefix.slice(this._prefix.length));
			if (node === void 0) {
				const [parentNode, key] = last(path);
				for (const k of parentNode.keys()) if (k !== LEAF && k.startsWith(key)) {
					const node = /* @__PURE__ */ new Map();
					node.set(k.slice(key.length), parentNode.get(k));
					return new SearchableMap(node, prefix);
				}
			}
			return new SearchableMap(node, prefix);
		}
		/**
		* @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/clear
		*/
		clear() {
			this._size = void 0;
			this._tree.clear();
		}
		/**
		* @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/delete
		* @param key  Key to delete
		*/
		delete(key) {
			this._size = void 0;
			return remove$1(this._tree, key);
		}
		/**
		* @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/entries
		* @return An iterator iterating through `[key, value]` entries.
		*/
		entries() {
			return new TreeIterator(this, ENTRIES);
		}
		/**
		* @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/forEach
		* @param fn  Iteration function
		*/
		forEach(fn) {
			for (const [key, value] of this) fn(key, value, this);
		}
		/**
		* Returns a Map of all the entries that have a key within the given edit
		* distance from the search key. The keys of the returned Map are the matching
		* keys, while the values are two-element arrays where the first element is
		* the value associated to the key, and the second is the edit distance of the
		* key to the search key.
		*
		* ### Usage:
		*
		* ```javascript
		* let map = new SearchableMap()
		* map.set('hello', 'world')
		* map.set('hell', 'yeah')
		* map.set('ciao', 'mondo')
		*
		* // Get all entries that match the key 'hallo' with a maximum edit distance of 2
		* map.fuzzyGet('hallo', 2)
		* // => Map(2) { 'hello' => ['world', 1], 'hell' => ['yeah', 2] }
		*
		* // In the example, the "hello" key has value "world" and edit distance of 1
		* // (change "e" to "a"), the key "hell" has value "yeah" and edit distance of 2
		* // (change "e" to "a", delete "o")
		* ```
		*
		* @param key  The search key
		* @param maxEditDistance  The maximum edit distance (Levenshtein)
		* @return A Map of the matching keys to their value and edit distance
		*/
		fuzzyGet(key, maxEditDistance) {
			return fuzzySearch(this._tree, key, maxEditDistance);
		}
		/**
		* @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/get
		* @param key  Key to get
		* @return Value associated to the key, or `undefined` if the key is not
		* found.
		*/
		get(key) {
			const node = lookup(this._tree, key);
			return node !== void 0 ? node.get(LEAF) : void 0;
		}
		/**
		* @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/has
		* @param key  Key
		* @return True if the key is in the map, false otherwise
		*/
		has(key) {
			const node = lookup(this._tree, key);
			return node !== void 0 && node.has(LEAF);
		}
		/**
		* @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/keys
		* @return An `Iterable` iterating through keys
		*/
		keys() {
			return new TreeIterator(this, KEYS);
		}
		/**
		* @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/set
		* @param key  Key to set
		* @param value  Value to associate to the key
		* @return The {@link SearchableMap} itself, to allow chaining
		*/
		set(key, value) {
			if (typeof key !== "string") throw new Error("key must be a string");
			this._size = void 0;
			createPath(this._tree, key).set(LEAF, value);
			return this;
		}
		/**
		* @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/size
		*/
		get size() {
			if (this._size) return this._size;
			/** @ignore */
			this._size = 0;
			const iter = this.entries();
			while (!iter.next().done) this._size += 1;
			return this._size;
		}
		/**
		* Updates the value at the given key using the provided function. The function
		* is called with the current value at the key, and its return value is used as
		* the new value to be set.
		*
		* ### Example:
		*
		* ```javascript
		* // Increment the current value by one
		* searchableMap.update('somekey', (currentValue) => currentValue == null ? 0 : currentValue + 1)
		* ```
		*
		* If the value at the given key is or will be an object, it might not require
		* re-assignment. In that case it is better to use `fetch()`, because it is
		* faster.
		*
		* @param key  The key to update
		* @param fn  The function used to compute the new value from the current one
		* @return The {@link SearchableMap} itself, to allow chaining
		*/
		update(key, fn) {
			if (typeof key !== "string") throw new Error("key must be a string");
			this._size = void 0;
			const node = createPath(this._tree, key);
			node.set(LEAF, fn(node.get(LEAF)));
			return this;
		}
		/**
		* Fetches the value of the given key. If the value does not exist, calls the
		* given function to create a new value, which is inserted at the given key
		* and subsequently returned.
		*
		* ### Example:
		*
		* ```javascript
		* const map = searchableMap.fetch('somekey', () => new Map())
		* map.set('foo', 'bar')
		* ```
		*
		* @param key  The key to update
		* @param initial  A function that creates a new value if the key does not exist
		* @return The existing or new value at the given key
		*/
		fetch(key, initial) {
			if (typeof key !== "string") throw new Error("key must be a string");
			this._size = void 0;
			const node = createPath(this._tree, key);
			let value = node.get(LEAF);
			if (value === void 0) node.set(LEAF, value = initial());
			return value;
		}
		/**
		* @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/values
		* @return An `Iterable` iterating through values.
		*/
		values() {
			return new TreeIterator(this, VALUES);
		}
		/**
		* @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/@@iterator
		*/
		[Symbol.iterator]() {
			return this.entries();
		}
		/**
		* Creates a {@link SearchableMap} from an `Iterable` of entries
		*
		* @param entries  Entries to be inserted in the {@link SearchableMap}
		* @return A new {@link SearchableMap} with the given entries
		*/
		static from(entries) {
			const tree = new SearchableMap();
			for (const [key, value] of entries) tree.set(key, value);
			return tree;
		}
		/**
		* Creates a {@link SearchableMap} from the iterable properties of a JavaScript object
		*
		* @param object  Object of entries for the {@link SearchableMap}
		* @return A new {@link SearchableMap} with the given entries
		*/
		static fromObject(object) {
			return SearchableMap.from(Object.entries(object));
		}
	};
	var trackDown = (tree, key, path = []) => {
		if (key.length === 0 || tree == null) return [tree, path];
		for (const k of tree.keys()) if (k !== LEAF && key.startsWith(k)) {
			path.push([tree, k]);
			return trackDown(tree.get(k), key.slice(k.length), path);
		}
		path.push([tree, key]);
		return trackDown(void 0, "", path);
	};
	var lookup = (tree, key) => {
		if (key.length === 0 || tree == null) return tree;
		for (const k of tree.keys()) if (k !== LEAF && key.startsWith(k)) return lookup(tree.get(k), key.slice(k.length));
	};
	var createPath = (node, key) => {
		const keyLength = key.length;
		outer: for (let pos = 0; node && pos < keyLength;) {
			for (const k of node.keys()) if (k !== LEAF && key[pos] === k[0]) {
				const len = Math.min(keyLength - pos, k.length);
				let offset = 1;
				while (offset < len && key[pos + offset] === k[offset]) ++offset;
				const child = node.get(k);
				if (offset === k.length) node = child;
				else {
					const intermediate = /* @__PURE__ */ new Map();
					intermediate.set(k.slice(offset), child);
					node.set(key.slice(pos, pos + offset), intermediate);
					node.delete(k);
					node = intermediate;
				}
				pos += offset;
				continue outer;
			}
			const child = /* @__PURE__ */ new Map();
			node.set(key.slice(pos), child);
			return child;
		}
		return node;
	};
	var remove$1 = (tree, key) => {
		const [node, path] = trackDown(tree, key);
		if (node === void 0) return;
		node.delete(LEAF);
		if (node.size === 0) cleanup(path);
		else if (node.size === 1) {
			const [key, value] = node.entries().next().value;
			merge(path, key, value);
		}
	};
	var cleanup = (path) => {
		if (path.length === 0) return;
		const [node, key] = last(path);
		node.delete(key);
		if (node.size === 0) cleanup(path.slice(0, -1));
		else if (node.size === 1) {
			const [key, value] = node.entries().next().value;
			if (key !== LEAF) merge(path.slice(0, -1), key, value);
		}
	};
	var merge = (path, key, value) => {
		if (path.length === 0) return;
		const [node, nodeKey] = last(path);
		node.set(nodeKey + key, value);
		node.delete(nodeKey);
	};
	var last = (array) => {
		return array[array.length - 1];
	};
	var OR = "or";
	var AND = "and";
	var AND_NOT = "and_not";
	/**
	* {@link MiniSearch} is the main entrypoint class, implementing a full-text
	* search engine in memory.
	*
	* @typeParam T  The type of the documents being indexed.
	*
	* ### Basic example:
	*
	* ```javascript
	* const documents = [
	*   {
	*     id: 1,
	*     title: 'Moby Dick',
	*     text: 'Call me Ishmael. Some years ago...',
	*     category: 'fiction'
	*   },
	*   {
	*     id: 2,
	*     title: 'Zen and the Art of Motorcycle Maintenance',
	*     text: 'I can see by my watch...',
	*     category: 'fiction'
	*   },
	*   {
	*     id: 3,
	*     title: 'Neuromancer',
	*     text: 'The sky above the port was...',
	*     category: 'fiction'
	*   },
	*   {
	*     id: 4,
	*     title: 'Zen and the Art of Archery',
	*     text: 'At first sight it must seem...',
	*     category: 'non-fiction'
	*   },
	*   // ...and more
	* ]
	*
	* // Create a search engine that indexes the 'title' and 'text' fields for
	* // full-text search. Search results will include 'title' and 'category' (plus the
	* // id field, that is always stored and returned)
	* const miniSearch = new MiniSearch({
	*   fields: ['title', 'text'],
	*   storeFields: ['title', 'category']
	* })
	*
	* // Add documents to the index
	* miniSearch.addAll(documents)
	*
	* // Search for documents:
	* let results = miniSearch.search('zen art motorcycle')
	* // => [
	* //   { id: 2, title: 'Zen and the Art of Motorcycle Maintenance', category: 'fiction', score: 2.77258 },
	* //   { id: 4, title: 'Zen and the Art of Archery', category: 'non-fiction', score: 1.38629 }
	* // ]
	* ```
	*/
	var MiniSearch = class MiniSearch {
		/**
		* @param options  Configuration options
		*
		* ### Examples:
		*
		* ```javascript
		* // Create a search engine that indexes the 'title' and 'text' fields of your
		* // documents:
		* const miniSearch = new MiniSearch({ fields: ['title', 'text'] })
		* ```
		*
		* ### ID Field:
		*
		* ```javascript
		* // Your documents are assumed to include a unique 'id' field, but if you want
		* // to use a different field for document identification, you can set the
		* // 'idField' option:
		* const miniSearch = new MiniSearch({ idField: 'key', fields: ['title', 'text'] })
		* ```
		*
		* ### Options and defaults:
		*
		* ```javascript
		* // The full set of options (here with their default value) is:
		* const miniSearch = new MiniSearch({
		*   // idField: field that uniquely identifies a document
		*   idField: 'id',
		*
		*   // extractField: function used to get the value of a field in a document.
		*   // By default, it assumes the document is a flat object with field names as
		*   // property keys and field values as string property values, but custom logic
		*   // can be implemented by setting this option to a custom extractor function.
		*   extractField: (document, fieldName) => document[fieldName],
		*
		*   // tokenize: function used to split fields into individual terms. By
		*   // default, it is also used to tokenize search queries, unless a specific
		*   // `tokenize` search option is supplied. When tokenizing an indexed field,
		*   // the field name is passed as the second argument.
		*   tokenize: (string, _fieldName) => string.split(SPACE_OR_PUNCTUATION),
		*
		*   // processTerm: function used to process each tokenized term before
		*   // indexing. It can be used for stemming and normalization. Return a falsy
		*   // value in order to discard a term. By default, it is also used to process
		*   // search queries, unless a specific `processTerm` option is supplied as a
		*   // search option. When processing a term from a indexed field, the field
		*   // name is passed as the second argument.
		*   processTerm: (term, _fieldName) => term.toLowerCase(),
		*
		*   // searchOptions: default search options, see the `search` method for
		*   // details
		*   searchOptions: undefined,
		*
		*   // fields: document fields to be indexed. Mandatory, but not set by default
		*   fields: undefined
		*
		*   // storeFields: document fields to be stored and returned as part of the
		*   // search results.
		*   storeFields: []
		* })
		* ```
		*/
		constructor(options) {
			if ((options === null || options === void 0 ? void 0 : options.fields) == null) throw new Error("MiniSearch: option \"fields\" must be provided");
			const autoVacuum = options.autoVacuum == null || options.autoVacuum === true ? defaultAutoVacuumOptions : options.autoVacuum;
			this._options = {
				...defaultOptions,
				...options,
				autoVacuum,
				searchOptions: {
					...defaultSearchOptions,
					...options.searchOptions || {}
				},
				autoSuggestOptions: {
					...defaultAutoSuggestOptions,
					...options.autoSuggestOptions || {}
				}
			};
			this._index = new SearchableMap();
			this._documentCount = 0;
			this._documentIds = /* @__PURE__ */ new Map();
			this._idToShortId = /* @__PURE__ */ new Map();
			this._fieldIds = {};
			this._fieldLength = /* @__PURE__ */ new Map();
			this._avgFieldLength = [];
			this._nextId = 0;
			this._storedFields = /* @__PURE__ */ new Map();
			this._dirtCount = 0;
			this._currentVacuum = null;
			this._enqueuedVacuum = null;
			this._enqueuedVacuumConditions = defaultVacuumConditions;
			this.addFields(this._options.fields);
		}
		/**
		* Adds a document to the index
		*
		* @param document  The document to be indexed
		*/
		add(document) {
			const { extractField, stringifyField, tokenize, processTerm, fields, idField } = this._options;
			const id = extractField(document, idField);
			if (id == null) throw new Error(`MiniSearch: document does not have ID field "${idField}"`);
			if (this._idToShortId.has(id)) throw new Error(`MiniSearch: duplicate ID ${id}`);
			const shortDocumentId = this.addDocumentId(id);
			this.saveStoredFields(shortDocumentId, document);
			for (const field of fields) {
				const fieldValue = extractField(document, field);
				if (fieldValue == null) continue;
				const tokens = tokenize(stringifyField(fieldValue, field), field);
				const fieldId = this._fieldIds[field];
				const uniqueTerms = new Set(tokens).size;
				this.addFieldLength(shortDocumentId, fieldId, this._documentCount - 1, uniqueTerms);
				for (const term of tokens) {
					const processedTerm = processTerm(term, field);
					if (Array.isArray(processedTerm)) for (const t of processedTerm) this.addTerm(fieldId, shortDocumentId, t);
					else if (processedTerm) this.addTerm(fieldId, shortDocumentId, processedTerm);
				}
			}
		}
		/**
		* Adds all the given documents to the index
		*
		* @param documents  An array of documents to be indexed
		*/
		addAll(documents) {
			for (const document of documents) this.add(document);
		}
		/**
		* Adds all the given documents to the index asynchronously.
		*
		* Returns a promise that resolves (to `undefined`) when the indexing is done.
		* This method is useful when index many documents, to avoid blocking the main
		* thread. The indexing is performed asynchronously and in chunks.
		*
		* @param documents  An array of documents to be indexed
		* @param options  Configuration options
		* @return A promise resolving to `undefined` when the indexing is done
		*/
		addAllAsync(documents, options = {}) {
			const { chunkSize = 10 } = options;
			const acc = {
				chunk: [],
				promise: Promise.resolve()
			};
			const { chunk, promise } = documents.reduce(({ chunk, promise }, document, i) => {
				chunk.push(document);
				if ((i + 1) % chunkSize === 0) return {
					chunk: [],
					promise: promise.then(() => new Promise((resolve) => setTimeout(resolve, 0))).then(() => this.addAll(chunk))
				};
				else return {
					chunk,
					promise
				};
			}, acc);
			return promise.then(() => this.addAll(chunk));
		}
		/**
		* Removes the given document from the index.
		*
		* The document to remove must NOT have changed between indexing and removal,
		* otherwise the index will be corrupted.
		*
		* This method requires passing the full document to be removed (not just the
		* ID), and immediately removes the document from the inverted index, allowing
		* memory to be released. A convenient alternative is {@link
		* MiniSearch#discard}, which needs only the document ID, and has the same
		* visible effect, but delays cleaning up the index until the next vacuuming.
		*
		* @param document  The document to be removed
		*/
		remove(document) {
			const { tokenize, processTerm, extractField, stringifyField, fields, idField } = this._options;
			const id = extractField(document, idField);
			if (id == null) throw new Error(`MiniSearch: document does not have ID field "${idField}"`);
			const shortId = this._idToShortId.get(id);
			if (shortId == null) throw new Error(`MiniSearch: cannot remove document with ID ${id}: it is not in the index`);
			for (const field of fields) {
				const fieldValue = extractField(document, field);
				if (fieldValue == null) continue;
				const tokens = tokenize(stringifyField(fieldValue, field), field);
				const fieldId = this._fieldIds[field];
				const uniqueTerms = new Set(tokens).size;
				this.removeFieldLength(shortId, fieldId, this._documentCount, uniqueTerms);
				for (const term of tokens) {
					const processedTerm = processTerm(term, field);
					if (Array.isArray(processedTerm)) for (const t of processedTerm) this.removeTerm(fieldId, shortId, t);
					else if (processedTerm) this.removeTerm(fieldId, shortId, processedTerm);
				}
			}
			this._storedFields.delete(shortId);
			this._documentIds.delete(shortId);
			this._idToShortId.delete(id);
			this._fieldLength.delete(shortId);
			this._documentCount -= 1;
		}
		/**
		* Removes all the given documents from the index. If called with no arguments,
		* it removes _all_ documents from the index.
		*
		* @param documents  The documents to be removed. If this argument is omitted,
		* all documents are removed. Note that, for removing all documents, it is
		* more efficient to call this method with no arguments than to pass all
		* documents.
		*/
		removeAll(documents) {
			if (documents) for (const document of documents) this.remove(document);
			else if (arguments.length > 0) throw new Error("Expected documents to be present. Omit the argument to remove all documents.");
			else {
				this._index = new SearchableMap();
				this._documentCount = 0;
				this._documentIds = /* @__PURE__ */ new Map();
				this._idToShortId = /* @__PURE__ */ new Map();
				this._fieldLength = /* @__PURE__ */ new Map();
				this._avgFieldLength = [];
				this._storedFields = /* @__PURE__ */ new Map();
				this._nextId = 0;
			}
		}
		/**
		* Discards the document with the given ID, so it won't appear in search results
		*
		* It has the same visible effect of {@link MiniSearch.remove} (both cause the
		* document to stop appearing in searches), but a different effect on the
		* internal data structures:
		*
		*   - {@link MiniSearch#remove} requires passing the full document to be
		*   removed as argument, and removes it from the inverted index immediately.
		*
		*   - {@link MiniSearch#discard} instead only needs the document ID, and
		*   works by marking the current version of the document as discarded, so it
		*   is immediately ignored by searches. This is faster and more convenient
		*   than {@link MiniSearch#remove}, but the index is not immediately
		*   modified. To take care of that, vacuuming is performed after a certain
		*   number of documents are discarded, cleaning up the index and allowing
		*   memory to be released.
		*
		* After discarding a document, it is possible to re-add a new version, and
		* only the new version will appear in searches. In other words, discarding
		* and re-adding a document works exactly like removing and re-adding it. The
		* {@link MiniSearch.replace} method can also be used to replace a document
		* with a new version.
		*
		* #### Details about vacuuming
		*
		* Repetite calls to this method would leave obsolete document references in
		* the index, invisible to searches. Two mechanisms take care of cleaning up:
		* clean up during search, and vacuuming.
		*
		*   - Upon search, whenever a discarded ID is found (and ignored for the
		*   results), references to the discarded document are removed from the
		*   inverted index entries for the search terms. This ensures that subsequent
		*   searches for the same terms do not need to skip these obsolete references
		*   again.
		*
		*   - In addition, vacuuming is performed automatically by default (see the
		*   `autoVacuum` field in {@link Options}) after a certain number of
		*   documents are discarded. Vacuuming traverses all terms in the index,
		*   cleaning up all references to discarded documents. Vacuuming can also be
		*   triggered manually by calling {@link MiniSearch#vacuum}.
		*
		* @param id  The ID of the document to be discarded
		*/
		discard(id) {
			const shortId = this._idToShortId.get(id);
			if (shortId == null) throw new Error(`MiniSearch: cannot discard document with ID ${id}: it is not in the index`);
			this._idToShortId.delete(id);
			this._documentIds.delete(shortId);
			this._storedFields.delete(shortId);
			(this._fieldLength.get(shortId) || []).forEach((fieldLength, fieldId) => {
				this.removeFieldLength(shortId, fieldId, this._documentCount, fieldLength);
			});
			this._fieldLength.delete(shortId);
			this._documentCount -= 1;
			this._dirtCount += 1;
			this.maybeAutoVacuum();
		}
		maybeAutoVacuum() {
			if (this._options.autoVacuum === false) return;
			const { minDirtFactor, minDirtCount, batchSize, batchWait } = this._options.autoVacuum;
			this.conditionalVacuum({
				batchSize,
				batchWait
			}, {
				minDirtCount,
				minDirtFactor
			});
		}
		/**
		* Discards the documents with the given IDs, so they won't appear in search
		* results
		*
		* It is equivalent to calling {@link MiniSearch#discard} for all the given
		* IDs, but with the optimization of triggering at most one automatic
		* vacuuming at the end.
		*
		* Note: to remove all documents from the index, it is faster and more
		* convenient to call {@link MiniSearch.removeAll} with no argument, instead
		* of passing all IDs to this method.
		*/
		discardAll(ids) {
			const autoVacuum = this._options.autoVacuum;
			try {
				this._options.autoVacuum = false;
				for (const id of ids) this.discard(id);
			} finally {
				this._options.autoVacuum = autoVacuum;
			}
			this.maybeAutoVacuum();
		}
		/**
		* It replaces an existing document with the given updated version
		*
		* It works by discarding the current version and adding the updated one, so
		* it is functionally equivalent to calling {@link MiniSearch#discard}
		* followed by {@link MiniSearch#add}. The ID of the updated document should
		* be the same as the original one.
		*
		* Since it uses {@link MiniSearch#discard} internally, this method relies on
		* vacuuming to clean up obsolete document references from the index, allowing
		* memory to be released (see {@link MiniSearch#discard}).
		*
		* @param updatedDocument  The updated document to replace the old version
		* with
		*/
		replace(updatedDocument) {
			const { idField, extractField } = this._options;
			const id = extractField(updatedDocument, idField);
			this.discard(id);
			this.add(updatedDocument);
		}
		/**
		* Triggers a manual vacuuming, cleaning up references to discarded documents
		* from the inverted index
		*
		* Vacuuming is only useful for applications that use the {@link
		* MiniSearch#discard} or {@link MiniSearch#replace} methods.
		*
		* By default, vacuuming is performed automatically when needed (controlled by
		* the `autoVacuum` field in {@link Options}), so there is usually no need to
		* call this method, unless one wants to make sure to perform vacuuming at a
		* specific moment.
		*
		* Vacuuming traverses all terms in the inverted index in batches, and cleans
		* up references to discarded documents from the posting list, allowing memory
		* to be released.
		*
		* The method takes an optional object as argument with the following keys:
		*
		*   - `batchSize`: the size of each batch (1000 by default)
		*
		*   - `batchWait`: the number of milliseconds to wait between batches (10 by
		*   default)
		*
		* On large indexes, vacuuming could have a non-negligible cost: batching
		* avoids blocking the thread for long, diluting this cost so that it is not
		* negatively affecting the application. Nonetheless, this method should only
		* be called when necessary, and relying on automatic vacuuming is usually
		* better.
		*
		* It returns a promise that resolves (to undefined) when the clean up is
		* completed. If vacuuming is already ongoing at the time this method is
		* called, a new one is enqueued immediately after the ongoing one, and a
		* corresponding promise is returned. However, no more than one vacuuming is
		* enqueued on top of the ongoing one, even if this method is called more
		* times (enqueuing multiple ones would be useless).
		*
		* @param options  Configuration options for the batch size and delay. See
		* {@link VacuumOptions}.
		*/
		vacuum(options = {}) {
			return this.conditionalVacuum(options);
		}
		conditionalVacuum(options, conditions) {
			if (this._currentVacuum) {
				this._enqueuedVacuumConditions = this._enqueuedVacuumConditions && conditions;
				if (this._enqueuedVacuum != null) return this._enqueuedVacuum;
				this._enqueuedVacuum = this._currentVacuum.then(() => {
					const conditions = this._enqueuedVacuumConditions;
					this._enqueuedVacuumConditions = defaultVacuumConditions;
					return this.performVacuuming(options, conditions);
				});
				return this._enqueuedVacuum;
			}
			if (this.vacuumConditionsMet(conditions) === false) return Promise.resolve();
			this._currentVacuum = this.performVacuuming(options);
			return this._currentVacuum;
		}
		async performVacuuming(options, conditions) {
			const initialDirtCount = this._dirtCount;
			if (this.vacuumConditionsMet(conditions)) {
				const batchSize = options.batchSize || defaultVacuumOptions.batchSize;
				const batchWait = options.batchWait || defaultVacuumOptions.batchWait;
				let i = 1;
				for (const [term, fieldsData] of this._index) {
					for (const [fieldId, fieldIndex] of fieldsData) for (const [shortId] of fieldIndex) {
						if (this._documentIds.has(shortId)) continue;
						if (fieldIndex.size <= 1) fieldsData.delete(fieldId);
						else fieldIndex.delete(shortId);
					}
					if (this._index.get(term).size === 0) this._index.delete(term);
					if (i % batchSize === 0) await new Promise((resolve) => setTimeout(resolve, batchWait));
					i += 1;
				}
				this._dirtCount -= initialDirtCount;
			}
			await null;
			this._currentVacuum = this._enqueuedVacuum;
			this._enqueuedVacuum = null;
		}
		vacuumConditionsMet(conditions) {
			if (conditions == null) return true;
			let { minDirtCount, minDirtFactor } = conditions;
			minDirtCount = minDirtCount || defaultAutoVacuumOptions.minDirtCount;
			minDirtFactor = minDirtFactor || defaultAutoVacuumOptions.minDirtFactor;
			return this.dirtCount >= minDirtCount && this.dirtFactor >= minDirtFactor;
		}
		/**
		* Is `true` if a vacuuming operation is ongoing, `false` otherwise
		*/
		get isVacuuming() {
			return this._currentVacuum != null;
		}
		/**
		* The number of documents discarded since the most recent vacuuming
		*/
		get dirtCount() {
			return this._dirtCount;
		}
		/**
		* A number between 0 and 1 giving an indication about the proportion of
		* documents that are discarded, and can therefore be cleaned up by vacuuming.
		* A value close to 0 means that the index is relatively clean, while a higher
		* value means that the index is relatively dirty, and vacuuming could release
		* memory.
		*/
		get dirtFactor() {
			return this._dirtCount / (1 + this._documentCount + this._dirtCount);
		}
		/**
		* Returns `true` if a document with the given ID is present in the index and
		* available for search, `false` otherwise
		*
		* @param id  The document ID
		*/
		has(id) {
			return this._idToShortId.has(id);
		}
		/**
		* Returns the stored fields (as configured in the `storeFields` constructor
		* option) for the given document ID. Returns `undefined` if the document is
		* not present in the index.
		*
		* @param id  The document ID
		*/
		getStoredFields(id) {
			const shortId = this._idToShortId.get(id);
			if (shortId == null) return;
			return this._storedFields.get(shortId);
		}
		/**
		* Search for documents matching the given search query.
		*
		* The result is a list of scored document IDs matching the query, sorted by
		* descending score, and each including data about which terms were matched and
		* in which fields.
		*
		* ### Basic usage:
		*
		* ```javascript
		* // Search for "zen art motorcycle" with default options: terms have to match
		* // exactly, and individual terms are joined with OR
		* miniSearch.search('zen art motorcycle')
		* // => [ { id: 2, score: 2.77258, match: { ... } }, { id: 4, score: 1.38629, match: { ... } } ]
		* ```
		*
		* ### Restrict search to specific fields:
		*
		* ```javascript
		* // Search only in the 'title' field
		* miniSearch.search('zen', { fields: ['title'] })
		* ```
		*
		* ### Field boosting:
		*
		* ```javascript
		* // Boost a field
		* miniSearch.search('zen', { boost: { title: 2 } })
		* ```
		*
		* ### Prefix search:
		*
		* ```javascript
		* // Search for "moto" with prefix search (it will match documents
		* // containing terms that start with "moto" or "neuro")
		* miniSearch.search('moto neuro', { prefix: true })
		* ```
		*
		* ### Fuzzy search:
		*
		* ```javascript
		* // Search for "ismael" with fuzzy search (it will match documents containing
		* // terms similar to "ismael", with a maximum edit distance of 0.2 term.length
		* // (rounded to nearest integer)
		* miniSearch.search('ismael', { fuzzy: 0.2 })
		* ```
		*
		* ### Combining strategies:
		*
		* ```javascript
		* // Mix of exact match, prefix search, and fuzzy search
		* miniSearch.search('ismael mob', {
		*  prefix: true,
		*  fuzzy: 0.2
		* })
		* ```
		*
		* ### Advanced prefix and fuzzy search:
		*
		* ```javascript
		* // Perform fuzzy and prefix search depending on the search term. Here
		* // performing prefix and fuzzy search only on terms longer than 3 characters
		* miniSearch.search('ismael mob', {
		*  prefix: term => term.length > 3
		*  fuzzy: term => term.length > 3 ? 0.2 : null
		* })
		* ```
		*
		* ### Combine with AND:
		*
		* ```javascript
		* // Combine search terms with AND (to match only documents that contain both
		* // "motorcycle" and "art")
		* miniSearch.search('motorcycle art', { combineWith: 'AND' })
		* ```
		*
		* ### Combine with AND_NOT:
		*
		* There is also an AND_NOT combinator, that finds documents that match the
		* first term, but do not match any of the other terms. This combinator is
		* rarely useful with simple queries, and is meant to be used with advanced
		* query combinations (see later for more details).
		*
		* ### Filtering results:
		*
		* ```javascript
		* // Filter only results in the 'fiction' category (assuming that 'category'
		* // is a stored field)
		* miniSearch.search('motorcycle art', {
		*   filter: (result) => result.category === 'fiction'
		* })
		* ```
		*
		* ### Wildcard query
		*
		* Searching for an empty string (assuming the default tokenizer) returns no
		* results. Sometimes though, one needs to match all documents, like in a
		* "wildcard" search. This is possible by passing the special value
		* {@link MiniSearch.wildcard} as the query:
		*
		* ```javascript
		* // Return search results for all documents
		* miniSearch.search(MiniSearch.wildcard)
		* ```
		*
		* Note that search options such as `filter` and `boostDocument` are still
		* applied, influencing which results are returned, and their order:
		*
		* ```javascript
		* // Return search results for all documents in the 'fiction' category
		* miniSearch.search(MiniSearch.wildcard, {
		*   filter: (result) => result.category === 'fiction'
		* })
		* ```
		*
		* ### Advanced combination of queries:
		*
		* It is possible to combine different subqueries with OR, AND, and AND_NOT,
		* and even with different search options, by passing a query expression
		* tree object as the first argument, instead of a string.
		*
		* ```javascript
		* // Search for documents that contain "zen" and ("motorcycle" or "archery")
		* miniSearch.search({
		*   combineWith: 'AND',
		*   queries: [
		*     'zen',
		*     {
		*       combineWith: 'OR',
		*       queries: ['motorcycle', 'archery']
		*     }
		*   ]
		* })
		*
		* // Search for documents that contain ("apple" or "pear") but not "juice" and
		* // not "tree"
		* miniSearch.search({
		*   combineWith: 'AND_NOT',
		*   queries: [
		*     {
		*       combineWith: 'OR',
		*       queries: ['apple', 'pear']
		*     },
		*     'juice',
		*     'tree'
		*   ]
		* })
		* ```
		*
		* Each node in the expression tree can be either a string, or an object that
		* supports all {@link SearchOptions} fields, plus a `queries` array field for
		* subqueries.
		*
		* Note that, while this can become complicated to do by hand for complex or
		* deeply nested queries, it provides a formalized expression tree API for
		* external libraries that implement a parser for custom query languages.
		*
		* @param query  Search query
		* @param searchOptions  Search options. Each option, if not given, defaults to the corresponding value of `searchOptions` given to the constructor, or to the library default.
		*/
		search(query, searchOptions = {}) {
			const { searchOptions: globalSearchOptions } = this._options;
			const searchOptionsWithDefaults = {
				...globalSearchOptions,
				...searchOptions
			};
			const rawResults = this.executeQuery(query, searchOptions);
			const results = [];
			for (const [docId, { score, terms, match }] of rawResults) {
				const quality = terms.length || 1;
				const result = {
					id: this._documentIds.get(docId),
					score: score * quality,
					terms: Object.keys(match),
					queryTerms: terms,
					match
				};
				Object.assign(result, this._storedFields.get(docId));
				if (searchOptionsWithDefaults.filter == null || searchOptionsWithDefaults.filter(result)) results.push(result);
			}
			if (query === MiniSearch.wildcard && searchOptionsWithDefaults.boostDocument == null) return results;
			results.sort(byScore);
			return results;
		}
		/**
		* Provide suggestions for the given search query
		*
		* The result is a list of suggested modified search queries, derived from the
		* given search query, each with a relevance score, sorted by descending score.
		*
		* By default, it uses the same options used for search, except that by
		* default it performs prefix search on the last term of the query, and
		* combine terms with `'AND'` (requiring all query terms to match). Custom
		* options can be passed as a second argument. Defaults can be changed upon
		* calling the {@link MiniSearch} constructor, by passing a
		* `autoSuggestOptions` option.
		*
		* ### Basic usage:
		*
		* ```javascript
		* // Get suggestions for 'neuro':
		* miniSearch.autoSuggest('neuro')
		* // => [ { suggestion: 'neuromancer', terms: [ 'neuromancer' ], score: 0.46240 } ]
		* ```
		*
		* ### Multiple words:
		*
		* ```javascript
		* // Get suggestions for 'zen ar':
		* miniSearch.autoSuggest('zen ar')
		* // => [
		* //  { suggestion: 'zen archery art', terms: [ 'zen', 'archery', 'art' ], score: 1.73332 },
		* //  { suggestion: 'zen art', terms: [ 'zen', 'art' ], score: 1.21313 }
		* // ]
		* ```
		*
		* ### Fuzzy suggestions:
		*
		* ```javascript
		* // Correct spelling mistakes using fuzzy search:
		* miniSearch.autoSuggest('neromancer', { fuzzy: 0.2 })
		* // => [ { suggestion: 'neuromancer', terms: [ 'neuromancer' ], score: 1.03998 } ]
		* ```
		*
		* ### Filtering:
		*
		* ```javascript
		* // Get suggestions for 'zen ar', but only within the 'fiction' category
		* // (assuming that 'category' is a stored field):
		* miniSearch.autoSuggest('zen ar', {
		*   filter: (result) => result.category === 'fiction'
		* })
		* // => [
		* //  { suggestion: 'zen archery art', terms: [ 'zen', 'archery', 'art' ], score: 1.73332 },
		* //  { suggestion: 'zen art', terms: [ 'zen', 'art' ], score: 1.21313 }
		* // ]
		* ```
		*
		* @param queryString  Query string to be expanded into suggestions
		* @param options  Search options. The supported options and default values
		* are the same as for the {@link MiniSearch#search} method, except that by
		* default prefix search is performed on the last term in the query, and terms
		* are combined with `'AND'`.
		* @return  A sorted array of suggestions sorted by relevance score.
		*/
		autoSuggest(queryString, options = {}) {
			options = {
				...this._options.autoSuggestOptions,
				...options
			};
			const suggestions = /* @__PURE__ */ new Map();
			for (const { score, terms } of this.search(queryString, options)) {
				const phrase = terms.join(" ");
				const suggestion = suggestions.get(phrase);
				if (suggestion != null) {
					suggestion.score += score;
					suggestion.count += 1;
				} else suggestions.set(phrase, {
					score,
					terms,
					count: 1
				});
			}
			const results = [];
			for (const [suggestion, { score, terms, count }] of suggestions) results.push({
				suggestion,
				terms,
				score: score / count
			});
			results.sort(byScore);
			return results;
		}
		/**
		* Total number of documents available to search
		*/
		get documentCount() {
			return this._documentCount;
		}
		/**
		* Number of terms in the index
		*/
		get termCount() {
			return this._index.size;
		}
		/**
		* Deserializes a JSON index (serialized with `JSON.stringify(miniSearch)`)
		* and instantiates a MiniSearch instance. It should be given the same options
		* originally used when serializing the index.
		*
		* ### Usage:
		*
		* ```javascript
		* // If the index was serialized with:
		* let miniSearch = new MiniSearch({ fields: ['title', 'text'] })
		* miniSearch.addAll(documents)
		*
		* const json = JSON.stringify(miniSearch)
		* // It can later be deserialized like this:
		* miniSearch = MiniSearch.loadJSON(json, { fields: ['title', 'text'] })
		* ```
		*
		* @param json  JSON-serialized index
		* @param options  configuration options, same as the constructor
		* @return An instance of MiniSearch deserialized from the given JSON.
		*/
		static loadJSON(json, options) {
			if (options == null) throw new Error("MiniSearch: loadJSON should be given the same options used when serializing the index");
			return this.loadJS(JSON.parse(json), options);
		}
		/**
		* Async equivalent of {@link MiniSearch.loadJSON}
		*
		* This function is an alternative to {@link MiniSearch.loadJSON} that returns
		* a promise, and loads the index in batches, leaving pauses between them to avoid
		* blocking the main thread. It tends to be slower than the synchronous
		* version, but does not block the main thread, so it can be a better choice
		* when deserializing very large indexes.
		*
		* @param json  JSON-serialized index
		* @param options  configuration options, same as the constructor
		* @return A Promise that will resolve to an instance of MiniSearch deserialized from the given JSON.
		*/
		static async loadJSONAsync(json, options) {
			if (options == null) throw new Error("MiniSearch: loadJSON should be given the same options used when serializing the index");
			return this.loadJSAsync(JSON.parse(json), options);
		}
		/**
		* Returns the default value of an option. It will throw an error if no option
		* with the given name exists.
		*
		* @param optionName  Name of the option
		* @return The default value of the given option
		*
		* ### Usage:
		*
		* ```javascript
		* // Get default tokenizer
		* MiniSearch.getDefault('tokenize')
		*
		* // Get default term processor
		* MiniSearch.getDefault('processTerm')
		*
		* // Unknown options will throw an error
		* MiniSearch.getDefault('notExisting')
		* // => throws 'MiniSearch: unknown option "notExisting"'
		* ```
		*/
		static getDefault(optionName) {
			if (defaultOptions.hasOwnProperty(optionName)) return getOwnProperty(defaultOptions, optionName);
			else throw new Error(`MiniSearch: unknown option "${optionName}"`);
		}
		/**
		* @ignore
		*/
		static loadJS(js, options) {
			const { index, documentIds, fieldLength, storedFields, serializationVersion } = js;
			const miniSearch = this.instantiateMiniSearch(js, options);
			miniSearch._documentIds = objectToNumericMap(documentIds);
			miniSearch._fieldLength = objectToNumericMap(fieldLength);
			miniSearch._storedFields = objectToNumericMap(storedFields);
			for (const [shortId, id] of miniSearch._documentIds) miniSearch._idToShortId.set(id, shortId);
			for (const [term, data] of index) {
				const dataMap = /* @__PURE__ */ new Map();
				for (const fieldId of Object.keys(data)) {
					let indexEntry = data[fieldId];
					if (serializationVersion === 1) indexEntry = indexEntry.ds;
					dataMap.set(parseInt(fieldId, 10), objectToNumericMap(indexEntry));
				}
				miniSearch._index.set(term, dataMap);
			}
			return miniSearch;
		}
		/**
		* @ignore
		*/
		static async loadJSAsync(js, options) {
			const { index, documentIds, fieldLength, storedFields, serializationVersion } = js;
			const miniSearch = this.instantiateMiniSearch(js, options);
			miniSearch._documentIds = await objectToNumericMapAsync(documentIds);
			miniSearch._fieldLength = await objectToNumericMapAsync(fieldLength);
			miniSearch._storedFields = await objectToNumericMapAsync(storedFields);
			for (const [shortId, id] of miniSearch._documentIds) miniSearch._idToShortId.set(id, shortId);
			let count = 0;
			for (const [term, data] of index) {
				const dataMap = /* @__PURE__ */ new Map();
				for (const fieldId of Object.keys(data)) {
					let indexEntry = data[fieldId];
					if (serializationVersion === 1) indexEntry = indexEntry.ds;
					dataMap.set(parseInt(fieldId, 10), await objectToNumericMapAsync(indexEntry));
				}
				if (++count % 1e3 === 0) await wait(0);
				miniSearch._index.set(term, dataMap);
			}
			return miniSearch;
		}
		/**
		* @ignore
		*/
		static instantiateMiniSearch(js, options) {
			const { documentCount, nextId, fieldIds, averageFieldLength, dirtCount, serializationVersion } = js;
			if (serializationVersion !== 1 && serializationVersion !== 2) throw new Error("MiniSearch: cannot deserialize an index created with an incompatible version");
			const miniSearch = new MiniSearch(options);
			miniSearch._documentCount = documentCount;
			miniSearch._nextId = nextId;
			miniSearch._idToShortId = /* @__PURE__ */ new Map();
			miniSearch._fieldIds = fieldIds;
			miniSearch._avgFieldLength = averageFieldLength;
			miniSearch._dirtCount = dirtCount || 0;
			miniSearch._index = new SearchableMap();
			return miniSearch;
		}
		/**
		* @ignore
		*/
		executeQuery(query, searchOptions = {}) {
			if (query === MiniSearch.wildcard) return this.executeWildcardQuery(searchOptions);
			if (typeof query !== "string") {
				const options = {
					...searchOptions,
					...query,
					queries: void 0
				};
				const results = query.queries.map((subquery) => this.executeQuery(subquery, options));
				return this.combineResults(results, options.combineWith);
			}
			const { tokenize, processTerm, searchOptions: globalSearchOptions } = this._options;
			const options = {
				tokenize,
				processTerm,
				...globalSearchOptions,
				...searchOptions
			};
			const { tokenize: searchTokenize, processTerm: searchProcessTerm } = options;
			const results = searchTokenize(query).flatMap((term) => searchProcessTerm(term)).filter((term) => !!term).map(termToQuerySpec(options)).map((query) => this.executeQuerySpec(query, options));
			return this.combineResults(results, options.combineWith);
		}
		/**
		* @ignore
		*/
		executeQuerySpec(query, searchOptions) {
			const options = {
				...this._options.searchOptions,
				...searchOptions
			};
			const boosts = (options.fields || this._options.fields).reduce((boosts, field) => ({
				...boosts,
				[field]: getOwnProperty(options.boost, field) || 1
			}), {});
			const { boostDocument, weights, maxFuzzy, bm25: bm25params } = options;
			const { fuzzy: fuzzyWeight, prefix: prefixWeight } = {
				...defaultSearchOptions.weights,
				...weights
			};
			const data = this._index.get(query.term);
			const results = this.termResults(query.term, query.term, 1, query.termBoost, data, boosts, boostDocument, bm25params);
			let prefixMatches;
			let fuzzyMatches;
			if (query.prefix) prefixMatches = this._index.atPrefix(query.term);
			if (query.fuzzy) {
				const fuzzy = query.fuzzy === true ? .2 : query.fuzzy;
				const maxDistance = fuzzy < 1 ? Math.min(maxFuzzy, Math.round(query.term.length * fuzzy)) : fuzzy;
				if (maxDistance) fuzzyMatches = this._index.fuzzyGet(query.term, maxDistance);
			}
			if (prefixMatches) for (const [term, data] of prefixMatches) {
				const distance = term.length - query.term.length;
				if (!distance) continue;
				fuzzyMatches === null || fuzzyMatches === void 0 || fuzzyMatches.delete(term);
				const weight = prefixWeight * term.length / (term.length + .3 * distance);
				this.termResults(query.term, term, weight, query.termBoost, data, boosts, boostDocument, bm25params, results);
			}
			if (fuzzyMatches) for (const term of fuzzyMatches.keys()) {
				const [data, distance] = fuzzyMatches.get(term);
				if (!distance) continue;
				const weight = fuzzyWeight * term.length / (term.length + distance);
				this.termResults(query.term, term, weight, query.termBoost, data, boosts, boostDocument, bm25params, results);
			}
			return results;
		}
		/**
		* @ignore
		*/
		executeWildcardQuery(searchOptions) {
			const results = /* @__PURE__ */ new Map();
			const options = {
				...this._options.searchOptions,
				...searchOptions
			};
			for (const [shortId, id] of this._documentIds) {
				const score = options.boostDocument ? options.boostDocument(id, "", this._storedFields.get(shortId)) : 1;
				results.set(shortId, {
					score,
					terms: [],
					match: {}
				});
			}
			return results;
		}
		/**
		* @ignore
		*/
		combineResults(results, combineWith = OR) {
			if (results.length === 0) return /* @__PURE__ */ new Map();
			const combinator = combinators[combineWith.toLowerCase()];
			if (!combinator) throw new Error(`Invalid combination operator: ${combineWith}`);
			return results.reduce(combinator) || /* @__PURE__ */ new Map();
		}
		/**
		* Allows serialization of the index to JSON, to possibly store it and later
		* deserialize it with {@link MiniSearch.loadJSON}.
		*
		* Normally one does not directly call this method, but rather call the
		* standard JavaScript `JSON.stringify()` passing the {@link MiniSearch}
		* instance, and JavaScript will internally call this method. Upon
		* deserialization, one must pass to {@link MiniSearch.loadJSON} the same
		* options used to create the original instance that was serialized.
		*
		* ### Usage:
		*
		* ```javascript
		* // Serialize the index:
		* let miniSearch = new MiniSearch({ fields: ['title', 'text'] })
		* miniSearch.addAll(documents)
		* const json = JSON.stringify(miniSearch)
		*
		* // Later, to deserialize it:
		* miniSearch = MiniSearch.loadJSON(json, { fields: ['title', 'text'] })
		* ```
		*
		* @return A plain-object serializable representation of the search index.
		*/
		toJSON() {
			const index = [];
			for (const [term, fieldIndex] of this._index) {
				const data = {};
				for (const [fieldId, freqs] of fieldIndex) data[fieldId] = Object.fromEntries(freqs);
				index.push([term, data]);
			}
			return {
				documentCount: this._documentCount,
				nextId: this._nextId,
				documentIds: Object.fromEntries(this._documentIds),
				fieldIds: this._fieldIds,
				fieldLength: Object.fromEntries(this._fieldLength),
				averageFieldLength: this._avgFieldLength,
				storedFields: Object.fromEntries(this._storedFields),
				dirtCount: this._dirtCount,
				index,
				serializationVersion: 2
			};
		}
		/**
		* @ignore
		*/
		termResults(sourceTerm, derivedTerm, termWeight, termBoost, fieldTermData, fieldBoosts, boostDocumentFn, bm25params, results = /* @__PURE__ */ new Map()) {
			if (fieldTermData == null) return results;
			for (const field of Object.keys(fieldBoosts)) {
				const fieldBoost = fieldBoosts[field];
				const fieldId = this._fieldIds[field];
				const fieldTermFreqs = fieldTermData.get(fieldId);
				if (fieldTermFreqs == null) continue;
				let matchingFields = fieldTermFreqs.size;
				const avgFieldLength = this._avgFieldLength[fieldId];
				for (const docId of fieldTermFreqs.keys()) {
					if (!this._documentIds.has(docId)) {
						this.removeTerm(fieldId, docId, derivedTerm);
						matchingFields -= 1;
						continue;
					}
					const docBoost = boostDocumentFn ? boostDocumentFn(this._documentIds.get(docId), derivedTerm, this._storedFields.get(docId)) : 1;
					if (!docBoost) continue;
					const termFreq = fieldTermFreqs.get(docId);
					const fieldLength = this._fieldLength.get(docId)[fieldId];
					const rawScore = calcBM25Score(termFreq, matchingFields, this._documentCount, fieldLength, avgFieldLength, bm25params);
					const weightedScore = termWeight * termBoost * fieldBoost * docBoost * rawScore;
					const result = results.get(docId);
					if (result) {
						result.score += weightedScore;
						assignUniqueTerm(result.terms, sourceTerm);
						const match = getOwnProperty(result.match, derivedTerm);
						if (match) match.push(field);
						else result.match[derivedTerm] = [field];
					} else results.set(docId, {
						score: weightedScore,
						terms: [sourceTerm],
						match: { [derivedTerm]: [field] }
					});
				}
			}
			return results;
		}
		/**
		* @ignore
		*/
		addTerm(fieldId, documentId, term) {
			const indexData = this._index.fetch(term, createMap);
			let fieldIndex = indexData.get(fieldId);
			if (fieldIndex == null) {
				fieldIndex = /* @__PURE__ */ new Map();
				fieldIndex.set(documentId, 1);
				indexData.set(fieldId, fieldIndex);
			} else {
				const docs = fieldIndex.get(documentId);
				fieldIndex.set(documentId, (docs || 0) + 1);
			}
		}
		/**
		* @ignore
		*/
		removeTerm(fieldId, documentId, term) {
			if (!this._index.has(term)) {
				this.warnDocumentChanged(documentId, fieldId, term);
				return;
			}
			const indexData = this._index.fetch(term, createMap);
			const fieldIndex = indexData.get(fieldId);
			if (fieldIndex == null || fieldIndex.get(documentId) == null) this.warnDocumentChanged(documentId, fieldId, term);
			else if (fieldIndex.get(documentId) <= 1) {
				if (fieldIndex.size <= 1) indexData.delete(fieldId);
				else fieldIndex.delete(documentId);
			} else fieldIndex.set(documentId, fieldIndex.get(documentId) - 1);
			if (this._index.get(term).size === 0) this._index.delete(term);
		}
		/**
		* @ignore
		*/
		warnDocumentChanged(shortDocumentId, fieldId, term) {
			for (const fieldName of Object.keys(this._fieldIds)) if (this._fieldIds[fieldName] === fieldId) {
				this._options.logger("warn", `MiniSearch: document with ID ${this._documentIds.get(shortDocumentId)} has changed before removal: term "${term}" was not present in field "${fieldName}". Removing a document after it has changed can corrupt the index!`, "version_conflict");
				return;
			}
		}
		/**
		* @ignore
		*/
		addDocumentId(documentId) {
			const shortDocumentId = this._nextId;
			this._idToShortId.set(documentId, shortDocumentId);
			this._documentIds.set(shortDocumentId, documentId);
			this._documentCount += 1;
			this._nextId += 1;
			return shortDocumentId;
		}
		/**
		* @ignore
		*/
		addFields(fields) {
			for (let i = 0; i < fields.length; i++) this._fieldIds[fields[i]] = i;
		}
		/**
		* @ignore
		*/
		addFieldLength(documentId, fieldId, count, length) {
			let fieldLengths = this._fieldLength.get(documentId);
			if (fieldLengths == null) this._fieldLength.set(documentId, fieldLengths = []);
			fieldLengths[fieldId] = length;
			const totalFieldLength = (this._avgFieldLength[fieldId] || 0) * count + length;
			this._avgFieldLength[fieldId] = totalFieldLength / (count + 1);
		}
		/**
		* @ignore
		*/
		removeFieldLength(documentId, fieldId, count, length) {
			if (count === 1) {
				this._avgFieldLength[fieldId] = 0;
				return;
			}
			const totalFieldLength = this._avgFieldLength[fieldId] * count - length;
			this._avgFieldLength[fieldId] = totalFieldLength / (count - 1);
		}
		/**
		* @ignore
		*/
		saveStoredFields(documentId, doc) {
			const { storeFields, extractField } = this._options;
			if (storeFields == null || storeFields.length === 0) return;
			let documentFields = this._storedFields.get(documentId);
			if (documentFields == null) this._storedFields.set(documentId, documentFields = {});
			for (const fieldName of storeFields) {
				const fieldValue = extractField(doc, fieldName);
				if (fieldValue !== void 0) documentFields[fieldName] = fieldValue;
			}
		}
	};
	/**
	* The special wildcard symbol that can be passed to {@link MiniSearch#search}
	* to match all documents
	*/
	MiniSearch.wildcard = Symbol("*");
	var getOwnProperty = (object, property) => Object.prototype.hasOwnProperty.call(object, property) ? object[property] : void 0;
	var combinators = {
		[OR]: (a, b) => {
			for (const docId of b.keys()) {
				const existing = a.get(docId);
				if (existing == null) a.set(docId, b.get(docId));
				else {
					const { score, terms, match } = b.get(docId);
					existing.score = existing.score + score;
					existing.match = Object.assign(existing.match, match);
					assignUniqueTerms(existing.terms, terms);
				}
			}
			return a;
		},
		[AND]: (a, b) => {
			const combined = /* @__PURE__ */ new Map();
			for (const docId of b.keys()) {
				const existing = a.get(docId);
				if (existing == null) continue;
				const { score, terms, match } = b.get(docId);
				assignUniqueTerms(existing.terms, terms);
				combined.set(docId, {
					score: existing.score + score,
					terms: existing.terms,
					match: Object.assign(existing.match, match)
				});
			}
			return combined;
		},
		[AND_NOT]: (a, b) => {
			for (const docId of b.keys()) a.delete(docId);
			return a;
		}
	};
	var defaultBM25params = {
		k: 1.2,
		b: .7,
		d: .5
	};
	var calcBM25Score = (termFreq, matchingCount, totalCount, fieldLength, avgFieldLength, bm25params) => {
		const { k, b, d } = bm25params;
		return Math.log(1 + (totalCount - matchingCount + .5) / (matchingCount + .5)) * (d + termFreq * (k + 1) / (termFreq + k * (1 - b + b * fieldLength / avgFieldLength)));
	};
	var termToQuerySpec = (options) => (term, i, terms) => {
		return {
			term,
			fuzzy: typeof options.fuzzy === "function" ? options.fuzzy(term, i, terms) : options.fuzzy || false,
			prefix: typeof options.prefix === "function" ? options.prefix(term, i, terms) : options.prefix === true,
			termBoost: typeof options.boostTerm === "function" ? options.boostTerm(term, i, terms) : 1
		};
	};
	var defaultOptions = {
		idField: "id",
		extractField: (document, fieldName) => document[fieldName],
		stringifyField: (fieldValue, fieldName) => fieldValue.toString(),
		tokenize: (text) => text.split(SPACE_OR_PUNCTUATION),
		processTerm: (term) => term.toLowerCase(),
		fields: void 0,
		searchOptions: void 0,
		storeFields: [],
		logger: (level, message) => {
			if (typeof (console === null || console === void 0 ? void 0 : console[level]) === "function") console[level](message);
		},
		autoVacuum: true
	};
	var defaultSearchOptions = {
		combineWith: OR,
		prefix: false,
		fuzzy: false,
		maxFuzzy: 6,
		boost: {},
		weights: {
			fuzzy: .45,
			prefix: .375
		},
		bm25: defaultBM25params
	};
	var defaultAutoSuggestOptions = {
		combineWith: AND,
		prefix: (term, i, terms) => i === terms.length - 1
	};
	var defaultVacuumOptions = {
		batchSize: 1e3,
		batchWait: 10
	};
	var defaultVacuumConditions = {
		minDirtFactor: .1,
		minDirtCount: 20
	};
	var defaultAutoVacuumOptions = {
		...defaultVacuumOptions,
		...defaultVacuumConditions
	};
	var assignUniqueTerm = (target, term) => {
		if (!target.includes(term)) target.push(term);
	};
	var assignUniqueTerms = (target, source) => {
		for (const term of source) if (!target.includes(term)) target.push(term);
	};
	var byScore = ({ score: a }, { score: b }) => b - a;
	var createMap = () => /* @__PURE__ */ new Map();
	var objectToNumericMap = (object) => {
		const map = /* @__PURE__ */ new Map();
		for (const key of Object.keys(object)) map.set(parseInt(key, 10), object[key]);
		return map;
	};
	var objectToNumericMapAsync = async (object) => {
		const map = /* @__PURE__ */ new Map();
		let count = 0;
		for (const key of Object.keys(object)) {
			map.set(parseInt(key, 10), object[key]);
			if (++count % 1e3 === 0) await wait(0);
		}
		return map;
	};
	var wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
	var SPACE_OR_PUNCTUATION = /[\n\r\p{Z}\p{P}]+/u;
	//#endregion
	//#region node_modules/dexie/import-wrapper-prod.mjs
	var import_dexie_min = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module, this$1) => {
		((e, t) => {
			"object" == typeof exports && "undefined" != typeof module ? module.exports = t() : "function" == typeof define && define.amd ? define(t) : (e = "undefined" != typeof globalThis ? globalThis : e || self).Dexie = t();
		})(this$1, function() {
			var B = function(e, t) {
				return (B = Object.setPrototypeOf || ({ __proto__: [] } instanceof Array ? function(e, t) {
					e.__proto__ = t;
				} : function(e, t) {
					for (var n in t) Object.prototype.hasOwnProperty.call(t, n) && (e[n] = t[n]);
				}))(e, t);
			};
			var _ = function() {
				return (_ = Object.assign || function(e) {
					for (var t, n = 1, r = arguments.length; n < r; n++) for (var i in t = arguments[n]) Object.prototype.hasOwnProperty.call(t, i) && (e[i] = t[i]);
					return e;
				}).apply(this, arguments);
			};
			function R(e, t, n) {
				if (n || 2 === arguments.length) for (var r, i = 0, o = t.length; i < o; i++) !r && i in t || ((r = r || Array.prototype.slice.call(t, 0, i))[i] = t[i]);
				return e.concat(r || Array.prototype.slice.call(t));
			}
			var f = "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : "undefined" != typeof window ? window : global, O = Object.keys, x = Array.isArray;
			function a(t, n) {
				return "object" == typeof n && O(n).forEach(function(e) {
					t[e] = n[e];
				}), t;
			}
			"undefined" == typeof Promise || f.Promise || (f.Promise = Promise);
			var F = Object.getPrototypeOf, N = {}.hasOwnProperty;
			function m(e, t) {
				return N.call(e, t);
			}
			function M(t, n) {
				"function" == typeof n && (n = n(F(t))), ("undefined" == typeof Reflect ? O : Reflect.ownKeys)(n).forEach(function(e) {
					u(t, e, n[e]);
				});
			}
			var L = Object.defineProperty;
			function u(e, t, n, r) {
				L(e, t, a(n && m(n, "get") && "function" == typeof n.get ? {
					get: n.get,
					set: n.set,
					configurable: !0
				} : {
					value: n,
					configurable: !0,
					writable: !0
				}, r));
			}
			function U(t) {
				return { from: function(e) {
					return t.prototype = Object.create(e.prototype), u(t.prototype, "constructor", t), { extend: M.bind(null, t.prototype) };
				} };
			}
			var z = Object.getOwnPropertyDescriptor;
			var V = [].slice;
			function W(e, t, n) {
				return V.call(e, t, n);
			}
			function Y(e, t) {
				return t(e);
			}
			function $(e) {
				if (!e) throw new Error("Assertion Failed");
			}
			function Q(e) {
				f.setImmediate ? setImmediate(e) : setTimeout(e, 0);
			}
			function c(e, t) {
				if ("string" == typeof t && m(e, t)) return e[t];
				if (!t) return e;
				if ("string" != typeof t) {
					for (var n = [], r = 0, i = t.length; r < i; ++r) {
						var o = c(e, t[r]);
						n.push(o);
					}
					return n;
				}
				var a, u = t.indexOf(".");
				return -1 === u || null == (a = e[t.substr(0, u)]) ? void 0 : c(a, t.substr(u + 1));
			}
			function b(e, t, n) {
				if (e && void 0 !== t && !("isFrozen" in Object && Object.isFrozen(e))) if ("string" != typeof t && "length" in t) {
					$("string" != typeof n && "length" in n);
					for (var r = 0, i = t.length; r < i; ++r) b(e, t[r], n[r]);
				} else {
					var o = t.indexOf(".");
					if (-1 !== o) {
						var a = t.substr(0, o), o = t.substr(o + 1);
						if ("" === o) void 0 === n ? x(e) && !isNaN(parseInt(a)) ? e.splice(a, 1) : delete e[a] : e[a] = n;
						else {
							var u = e[a];
							if (!u || !m(e, a)) {
								if (void 0 === n) return;
								u = e[a] = {};
							}
							b(u, o, n);
						}
					} else void 0 === n ? x(e) && !isNaN(parseInt(t)) ? e.splice(t, 1) : delete e[t] : e[t] = n;
				}
			}
			function G(e) {
				var t, n = {};
				for (t in e) m(e, t) && (n[t] = e[t]);
				return n;
			}
			var X = [].concat;
			function H(e) {
				return X.apply([], e);
			}
			var e = "BigUint64Array,BigInt64Array,Array,Boolean,String,Date,RegExp,Blob,File,FileList,FileSystemFileHandle,FileSystemDirectoryHandle,ArrayBuffer,DataView,Uint8ClampedArray,ImageBitmap,ImageData,Map,Set,CryptoKey".split(",").concat(H([
				8,
				16,
				32,
				64
			].map(function(t) {
				return [
					"Int",
					"Uint",
					"Float"
				].map(function(e) {
					return e + t + "Array";
				});
			}))).filter(function(e) {
				return f[e];
			}), J = new Set(e.map(function(e) {
				return f[e];
			}));
			var Z = null;
			function ee(e) {
				Z = /* @__PURE__ */ new WeakMap();
				e = function e(t) {
					if (!t || "object" != typeof t) return t;
					var n = Z.get(t);
					if (n) return n;
					if (x(t)) {
						n = [], Z.set(t, n);
						for (var r = 0, i = t.length; r < i; ++r) n.push(e(t[r]));
					} else if (J.has(t.constructor)) n = t;
					else {
						var o, a = F(t);
						for (o in n = a === Object.prototype ? {} : Object.create(a), Z.set(t, n), t) m(t, o) && (n[o] = e(t[o]));
					}
					return n;
				}(e);
				return Z = null, e;
			}
			var te = {}.toString;
			function ne(e) {
				return te.call(e).slice(8, -1);
			}
			var re = "undefined" != typeof Symbol ? Symbol.iterator : "@@iterator", ie = "symbol" == typeof re ? function(e) {
				var t;
				return null != e && (t = e[re]) && t.apply(e);
			} : function() {
				return null;
			};
			function oe(e, t) {
				t = e.indexOf(t);
				0 <= t && e.splice(t, 1);
			}
			var ae = {};
			function n(e) {
				var t, n, r, i;
				if (1 === arguments.length) {
					if (x(e)) return e.slice();
					if (this === ae && "string" == typeof e) return [e];
					if (i = ie(e)) for (n = []; !(r = i.next()).done;) n.push(r.value);
					else {
						if (null == e) return [e];
						if ("number" != typeof (t = e.length)) return [e];
						for (n = new Array(t); t--;) n[t] = e[t];
					}
				} else for (t = arguments.length, n = new Array(t); t--;) n[t] = arguments[t];
				return n;
			}
			var ue = "undefined" != typeof Symbol ? function(e) {
				return "AsyncFunction" === e[Symbol.toStringTag];
			} : function() {
				return !1;
			}, e = [
				"Unknown",
				"Constraint",
				"Data",
				"TransactionInactive",
				"ReadOnly",
				"Version",
				"NotFound",
				"InvalidState",
				"InvalidAccess",
				"Abort",
				"Timeout",
				"QuotaExceeded",
				"Syntax",
				"DataClone"
			], t = [
				"Modify",
				"Bulk",
				"OpenFailed",
				"VersionChange",
				"Schema",
				"Upgrade",
				"InvalidTable",
				"MissingAPI",
				"NoSuchDatabase",
				"InvalidArgument",
				"SubTransaction",
				"Unsupported",
				"Internal",
				"DatabaseClosed",
				"PrematureCommit",
				"ForeignAwait"
			].concat(e), se = {
				VersionChanged: "Database version changed by other database connection",
				DatabaseClosed: "Database has been closed",
				Abort: "Transaction aborted",
				TransactionInactive: "Transaction has already completed or failed",
				MissingAPI: "IndexedDB API missing. Please visit https://tinyurl.com/y2uuvskb"
			};
			function ce(e, t) {
				this.name = e, this.message = t;
			}
			function le(e, t) {
				return e + ". Errors: " + Object.keys(t).map(function(e) {
					return t[e].toString();
				}).filter(function(e, t, n) {
					return n.indexOf(e) === t;
				}).join("\n");
			}
			function fe(e, t, n, r) {
				this.failures = t, this.failedKeys = r, this.successCount = n, this.message = le(e, t);
			}
			function he(e, t) {
				this.name = "BulkError", this.failures = Object.keys(t).map(function(e) {
					return t[e];
				}), this.failuresByPos = t, this.message = le(e, this.failures);
			}
			U(ce).from(Error).extend({ toString: function() {
				return this.name + ": " + this.message;
			} }), U(fe).from(ce), U(he).from(ce);
			var de = t.reduce(function(e, t) {
				return e[t] = t + "Error", e;
			}, {}), pe = ce, k = t.reduce(function(e, n) {
				var r = n + "Error";
				function t(e, t) {
					this.name = r, e ? "string" == typeof e ? (this.message = "".concat(e).concat(t ? "\n " + t : ""), this.inner = t || null) : "object" == typeof e && (this.message = "".concat(e.name, " ").concat(e.message), this.inner = e) : (this.message = se[n] || r, this.inner = null);
				}
				return U(t).from(pe), e[n] = t, e;
			}, {}), ye = (k.Syntax = SyntaxError, k.Type = TypeError, k.Range = RangeError, e.reduce(function(e, t) {
				return e[t + "Error"] = k[t], e;
			}, {}));
			e = t.reduce(function(e, t) {
				return -1 === [
					"Syntax",
					"Type",
					"Range"
				].indexOf(t) && (e[t + "Error"] = k[t]), e;
			}, {});
			function g() {}
			function ve(e) {
				return e;
			}
			function me(t, n) {
				return null == t || t === ve ? n : function(e) {
					return n(t(e));
				};
			}
			function be(e, t) {
				return function() {
					e.apply(this, arguments), t.apply(this, arguments);
				};
			}
			function ge(i, o) {
				return i === g ? o : function() {
					var e = i.apply(this, arguments), t = (void 0 !== e && (arguments[0] = e), this.onsuccess), n = this.onerror, r = (this.onsuccess = null, this.onerror = null, o.apply(this, arguments));
					return t && (this.onsuccess = this.onsuccess ? be(t, this.onsuccess) : t), n && (this.onerror = this.onerror ? be(n, this.onerror) : n), void 0 !== r ? r : e;
				};
			}
			function we(n, r) {
				return n === g ? r : function() {
					n.apply(this, arguments);
					var e = this.onsuccess, t = this.onerror;
					this.onsuccess = this.onerror = null, r.apply(this, arguments), e && (this.onsuccess = this.onsuccess ? be(e, this.onsuccess) : e), t && (this.onerror = this.onerror ? be(t, this.onerror) : t);
				};
			}
			function _e(i, o) {
				return i === g ? o : function() {
					var e = i.apply(this, arguments), t = (a(arguments[0], e), this.onsuccess), n = this.onerror, r = (this.onsuccess = null, this.onerror = null, o.apply(this, arguments));
					return t && (this.onsuccess = this.onsuccess ? be(t, this.onsuccess) : t), n && (this.onerror = this.onerror ? be(n, this.onerror) : n), void 0 === e ? void 0 === r ? void 0 : r : a(e, r);
				};
			}
			function xe(e, t) {
				return e === g ? t : function() {
					return !1 !== t.apply(this, arguments) && e.apply(this, arguments);
				};
			}
			function ke(i, o) {
				return i === g ? o : function() {
					var e = i.apply(this, arguments);
					if (e && "function" == typeof e.then) {
						for (var t = this, n = arguments.length, r = new Array(n); n--;) r[n] = arguments[n];
						return e.then(function() {
							return o.apply(t, r);
						});
					}
					return o.apply(this, arguments);
				};
			}
			e.ModifyError = fe, e.DexieError = ce, e.BulkError = he;
			var l = "undefined" != typeof location && /^(http|https):\/\/(localhost|127\.0\.0\.1)/.test(location.href);
			function Oe(e) {
				l = e;
			}
			var Pe = {}, Ke = 100, Ee = "undefined" == typeof Promise ? [] : (t = Promise.resolve(), "undefined" != typeof crypto && crypto.subtle ? [
				Ee = crypto.subtle.digest("SHA-512", new Uint8Array([0])),
				F(Ee),
				t
			] : [
				t,
				F(t),
				t
			]), t = Ee[0], Se = Ee[1], Se = Se && Se.then, Ae = t && t.constructor, je = !!Ee[2];
			var Ce = function(e, t) {
				Re.push([e, t]), Ie && (queueMicrotask(Ye), Ie = !1);
			}, Te = !0, Ie = !0, qe = [], De = [], Be = ve, s = {
				id: "global",
				global: !0,
				ref: 0,
				unhandleds: [],
				onunhandled: g,
				pgp: !1,
				env: {},
				finalize: g
			}, P = s, Re = [], Fe = 0, Ne = [];
			function K(e) {
				if ("object" != typeof this) throw new TypeError("Promises must be constructed via new");
				this._listeners = [], this._lib = !1;
				var t = this._PSD = P;
				if ("function" != typeof e) {
					if (e !== Pe) throw new TypeError("Not a function");
					this._state = arguments[1], this._value = arguments[2], !1 === this._state && Ue(this, this._value);
				} else this._state = null, this._value = null, ++t.ref, function t(r, e) {
					try {
						e(function(n) {
							if (null === r._state) {
								if (n === r) throw new TypeError("A promise cannot be resolved with itself.");
								var e = r._lib && $e();
								n && "function" == typeof n.then ? t(r, function(e, t) {
									n instanceof K ? n._then(e, t) : n.then(e, t);
								}) : (r._state = !0, r._value = n, ze(r)), e && Qe();
							}
						}, Ue.bind(null, r));
					} catch (e) {
						Ue(r, e);
					}
				}(this, e);
			}
			var Me = {
				get: function() {
					var u = P, t = et;
					function e(n, r) {
						var i = this, o = !u.global && (u !== P || t !== et), a = o && !w(), e = new K(function(e, t) {
							Ve(i, new Le(ut(n, u, o, a), ut(r, u, o, a), e, t, u));
						});
						return this._consoleTask && (e._consoleTask = this._consoleTask), e;
					}
					return e.prototype = Pe, e;
				},
				set: function(e) {
					u(this, "then", e && e.prototype === Pe ? Me : {
						get: function() {
							return e;
						},
						set: Me.set
					});
				}
			};
			function Le(e, t, n, r, i) {
				this.onFulfilled = "function" == typeof e ? e : null, this.onRejected = "function" == typeof t ? t : null, this.resolve = n, this.reject = r, this.psd = i;
			}
			function Ue(e, t) {
				var n, r;
				De.push(t), null === e._state && (n = e._lib && $e(), t = Be(t), e._state = !1, e._value = t, r = e, qe.some(function(e) {
					return e._value === r._value;
				}) || qe.push(r), ze(e), n) && Qe();
			}
			function ze(e) {
				var t = e._listeners;
				e._listeners = [];
				for (var n = 0, r = t.length; n < r; ++n) Ve(e, t[n]);
				var i = e._PSD;
				--i.ref || i.finalize(), 0 === Fe && (++Fe, Ce(function() {
					0 == --Fe && Ge();
				}, []));
			}
			function Ve(e, t) {
				if (null === e._state) e._listeners.push(t);
				else {
					var n = e._state ? t.onFulfilled : t.onRejected;
					if (null === n) return (e._state ? t.resolve : t.reject)(e._value);
					++t.psd.ref, ++Fe, Ce(We, [
						n,
						e,
						t
					]);
				}
			}
			function We(e, t, n) {
				try {
					var r, i = t._value;
					!t._state && De.length && (De = []), r = l && t._consoleTask ? t._consoleTask.run(function() {
						return e(i);
					}) : e(i), t._state || -1 !== De.indexOf(i) || ((e) => {
						for (var t = qe.length; t;) if (qe[--t]._value === e._value) return qe.splice(t, 1);
					})(t), n.resolve(r);
				} catch (e) {
					n.reject(e);
				} finally {
					0 == --Fe && Ge(), --n.psd.ref || n.psd.finalize();
				}
			}
			function Ye() {
				at(s, function() {
					$e() && Qe();
				});
			}
			function $e() {
				var e = Te;
				return Ie = Te = !1, e;
			}
			function Qe() {
				var e, t, n;
				do
					for (; 0 < Re.length;) for (e = Re, Re = [], n = e.length, t = 0; t < n; ++t) {
						var r = e[t];
						r[0].apply(null, r[1]);
					}
				while (0 < Re.length);
				Ie = Te = !0;
			}
			function Ge() {
				for (var e = qe, t = (qe = [], e.forEach(function(e) {
					e._PSD.onunhandled.call(null, e._value, e);
				}), Ne.slice(0)), n = t.length; n;) t[--n]();
			}
			function Xe(e) {
				return new K(Pe, !1, e);
			}
			function E(n, r) {
				var i = P;
				return function() {
					var e = $e(), t = P;
					try {
						return h(i, !0), n.apply(this, arguments);
					} catch (e) {
						r && r(e);
					} finally {
						h(t, !1), e && Qe();
					}
				};
			}
			M(K.prototype, {
				then: Me,
				_then: function(e, t) {
					Ve(this, new Le(null, null, e, t, P));
				},
				catch: function(e) {
					var t, n;
					return 1 === arguments.length ? this.then(null, e) : (t = e, n = arguments[1], "function" == typeof t ? this.then(null, function(e) {
						return (e instanceof t ? n : Xe)(e);
					}) : this.then(null, function(e) {
						return (e && e.name === t ? n : Xe)(e);
					}));
				},
				finally: function(t) {
					return this.then(function(e) {
						return K.resolve(t()).then(function() {
							return e;
						});
					}, function(e) {
						return K.resolve(t()).then(function() {
							return Xe(e);
						});
					});
				},
				timeout: function(r, i) {
					var o = this;
					return r < 1 / 0 ? new K(function(e, t) {
						var n = setTimeout(function() {
							return t(new k.Timeout(i));
						}, r);
						o.then(e, t).finally(clearTimeout.bind(null, n));
					}) : this;
				}
			}), "undefined" != typeof Symbol && Symbol.toStringTag && u(K.prototype, Symbol.toStringTag, "Dexie.Promise"), s.env = ot(), M(K, {
				all: function() {
					var o = n.apply(null, arguments).map(rt);
					return new K(function(n, r) {
						0 === o.length && n([]);
						var i = o.length;
						o.forEach(function(e, t) {
							return K.resolve(e).then(function(e) {
								o[t] = e, --i || n(o);
							}, r);
						});
					});
				},
				resolve: function(n) {
					return n instanceof K ? n : n && "function" == typeof n.then ? new K(function(e, t) {
						n.then(e, t);
					}) : new K(Pe, !0, n);
				},
				reject: Xe,
				race: function() {
					var e = n.apply(null, arguments).map(rt);
					return new K(function(t, n) {
						e.map(function(e) {
							return K.resolve(e).then(t, n);
						});
					});
				},
				PSD: {
					get: function() {
						return P;
					},
					set: function(e) {
						return P = e;
					}
				},
				totalEchoes: { get: function() {
					return et;
				} },
				newPSD: v,
				usePSD: at,
				scheduler: {
					get: function() {
						return Ce;
					},
					set: function(e) {
						Ce = e;
					}
				},
				rejectionMapper: {
					get: function() {
						return Be;
					},
					set: function(e) {
						Be = e;
					}
				},
				follow: function(i, n) {
					return new K(function(e, t) {
						return v(function(n, r) {
							var e = P;
							e.unhandleds = [], e.onunhandled = r, e.finalize = be(function() {
								var t, e = this;
								t = function() {
									0 === e.unhandleds.length ? n() : r(e.unhandleds[0]);
								}, Ne.push(function e() {
									t(), Ne.splice(Ne.indexOf(e), 1);
								}), ++Fe, Ce(function() {
									0 == --Fe && Ge();
								}, []);
							}, e.finalize), i();
						}, n, e, t);
					});
				}
			}), Ae && (Ae.allSettled && u(K, "allSettled", function() {
				var e = n.apply(null, arguments).map(rt);
				return new K(function(n) {
					0 === e.length && n([]);
					var r = e.length, i = new Array(r);
					e.forEach(function(e, t) {
						return K.resolve(e).then(function(e) {
							return i[t] = {
								status: "fulfilled",
								value: e
							};
						}, function(e) {
							return i[t] = {
								status: "rejected",
								reason: e
							};
						}).then(function() {
							return --r || n(i);
						});
					});
				});
			}), Ae.any && "undefined" != typeof AggregateError && u(K, "any", function() {
				var e = n.apply(null, arguments).map(rt);
				return new K(function(n, r) {
					0 === e.length && r(/* @__PURE__ */ new AggregateError([]));
					var i = e.length, o = new Array(i);
					e.forEach(function(e, t) {
						return K.resolve(e).then(function(e) {
							return n(e);
						}, function(e) {
							o[t] = e, --i || r(new AggregateError(o));
						});
					});
				});
			}), Ae.withResolvers) && (K.withResolvers = Ae.withResolvers);
			var o = {
				awaits: 0,
				echoes: 0,
				id: 0
			}, He = 0, Je = [], Ze = 0, et = 0, tt = 0;
			function v(e, t, n, r) {
				var i = P, o = Object.create(i), t = (o.parent = i, o.ref = 0, o.global = !1, o.id = ++tt, s.env, o.env = je ? {
					Promise: K,
					PromiseProp: {
						value: K,
						configurable: !0,
						writable: !0
					},
					all: K.all,
					race: K.race,
					allSettled: K.allSettled,
					any: K.any,
					resolve: K.resolve,
					reject: K.reject
				} : {}, t && a(o, t), ++i.ref, o.finalize = function() {
					--this.parent.ref || this.parent.finalize();
				}, at(o, e, n, r));
				return 0 === o.ref && o.finalize(), t;
			}
			function nt() {
				return o.id || (o.id = ++He), ++o.awaits, o.echoes += Ke, o.id;
			}
			function w() {
				return !!o.awaits && (0 == --o.awaits && (o.id = 0), o.echoes = o.awaits * Ke, !0);
			}
			function rt(e) {
				return o.echoes && e && e.constructor === Ae ? (nt(), e.then(function(e) {
					return w(), e;
				}, function(e) {
					return w(), S(e);
				})) : e;
			}
			function it() {
				var e = Je[Je.length - 1];
				Je.pop(), h(e, !1);
			}
			function h(e, t) {
				var n, r, i = P;
				(t ? !o.echoes || Ze++ && e === P : !Ze || --Ze && e === P) || queueMicrotask(t ? function(e) {
					++et, o.echoes && 0 != --o.echoes || (o.echoes = o.awaits = o.id = 0), Je.push(P), h(e, !0);
				}.bind(null, e) : it), e !== P && (P = e, i === s && (s.env = ot()), je) && (n = s.env.Promise, r = e.env, i.global || e.global) && (Object.defineProperty(f, "Promise", r.PromiseProp), n.all = r.all, n.race = r.race, n.resolve = r.resolve, n.reject = r.reject, r.allSettled && (n.allSettled = r.allSettled), r.any) && (n.any = r.any);
			}
			function ot() {
				var e = f.Promise;
				return je ? {
					Promise: e,
					PromiseProp: Object.getOwnPropertyDescriptor(f, "Promise"),
					all: e.all,
					race: e.race,
					allSettled: e.allSettled,
					any: e.any,
					resolve: e.resolve,
					reject: e.reject
				} : {};
			}
			function at(e, t, n, r, i) {
				var o = P;
				try {
					return h(e, !0), t(n, r, i);
				} finally {
					h(o, !1);
				}
			}
			function ut(t, n, r, i) {
				return "function" != typeof t ? t : function() {
					var e = P;
					r && nt(), h(n, !0);
					try {
						return t.apply(this, arguments);
					} finally {
						h(e, !1), i && queueMicrotask(w);
					}
				};
			}
			function st(e) {
				Promise === Ae && 0 === o.echoes ? 0 === Ze ? e() : enqueueNativeMicroTask(e) : setTimeout(e, 0);
			}
			-1 === ("" + Se).indexOf("[native code]") && (nt = w = g);
			var S = K.reject;
			var ct = String.fromCharCode(65535), A = "Invalid key provided. Keys must be of type string, number, Date or Array<string | number | Date>.", lt = "String expected.", ft = "__dbnames", ht = "readonly", dt = "readwrite";
			function pt(e, t) {
				return e ? t ? function() {
					return e.apply(this, arguments) && t.apply(this, arguments);
				} : e : t;
			}
			var yt = {
				type: 3,
				lower: -1 / 0,
				lowerOpen: !1,
				upper: [[]],
				upperOpen: !1
			};
			function vt(t) {
				return "string" != typeof t || /\./.test(t) ? function(e) {
					return e;
				} : function(e) {
					return void 0 === e[t] && t in e && delete (e = ee(e))[t], e;
				};
			}
			function mt() {
				throw k.Type("Entity instances must never be new:ed. Instances are generated by the framework bypassing the constructor.");
			}
			function j(e, t) {
				try {
					var n = bt(e), r = bt(t);
					if (n !== r) return "Array" === n ? 1 : "Array" === r ? -1 : "binary" === n ? 1 : "binary" === r ? -1 : "string" === n ? 1 : "string" === r ? -1 : "Date" === n ? 1 : "Date" !== r ? NaN : -1;
					switch (n) {
						case "number":
						case "Date":
						case "string": return t < e ? 1 : e < t ? -1 : 0;
						case "binary":
							for (var i = gt(e), o = gt(t), a = i.length, u = o.length, s = a < u ? a : u, c = 0; c < s; ++c) if (i[c] !== o[c]) return i[c] < o[c] ? -1 : 1;
							return a === u ? 0 : a < u ? -1 : 1;
						case "Array":
							for (var l = e, f = t, h = l.length, d = f.length, p = h < d ? h : d, y = 0; y < p; ++y) {
								var v = j(l[y], f[y]);
								if (0 !== v) return v;
							}
							return h === d ? 0 : h < d ? -1 : 1;
					}
				} catch (e) {}
				return NaN;
			}
			function bt(e) {
				var t = typeof e;
				return "object" == t && (ArrayBuffer.isView(e) || "ArrayBuffer" === (t = ne(e))) ? "binary" : t;
			}
			function gt(e) {
				return e instanceof Uint8Array ? e : ArrayBuffer.isView(e) ? new Uint8Array(e.buffer, e.byteOffset, e.byteLength) : new Uint8Array(e);
			}
			function wt(t, n, r) {
				var e = t.schema.yProps;
				return e ? (n && 0 < r.numFailures && (n = n.filter(function(e, t) {
					return !r.failures[t];
				})), Promise.all(e.map(function(e) {
					e = e.updatesTable;
					return n ? t.db.table(e).where("k").anyOf(n).delete() : t.db.table(e).clear();
				})).then(function() {
					return r;
				})) : r;
			}
			xt.prototype.execute = function(e) {
				var t = this["@@propmod"];
				if (void 0 !== t.add) {
					var n = t.add;
					if (x(n)) return R(R([], x(e) ? e : [], !0), n, !0).sort();
					if ("number" == typeof n) return (Number(e) || 0) + n;
					if ("bigint" == typeof n) try {
						return BigInt(e) + n;
					} catch (e) {
						return BigInt(0) + n;
					}
					throw new TypeError("Invalid term ".concat(n));
				}
				if (void 0 !== t.remove) {
					var r = t.remove;
					if (x(r)) return x(e) ? e.filter(function(e) {
						return !r.includes(e);
					}).sort() : [];
					if ("number" == typeof r) return Number(e) - r;
					if ("bigint" == typeof r) try {
						return BigInt(e) - r;
					} catch (e) {
						return BigInt(0) - r;
					}
					throw new TypeError("Invalid subtrahend ".concat(r));
				}
				n = null == (n = t.replacePrefix) ? void 0 : n[0];
				return n && "string" == typeof e && e.startsWith(n) ? t.replacePrefix[1] + e.substring(n.length) : e;
			};
			var _t = xt;
			function xt(e) {
				this["@@propmod"] = e;
			}
			function kt(e, t) {
				for (var n = O(t), r = n.length, i = !1, o = 0; o < r; ++o) {
					var a = n[o], u = t[a], s = c(e, a);
					u instanceof _t ? (b(e, a, u.execute(s)), i = !0) : s !== u && (b(e, a, u), i = !0);
				}
				return i;
			}
			r.prototype._trans = function(e, r, t) {
				var n = this._tx || P.trans, i = this.name, o = l && "undefined" != typeof console && console.createTask && console.createTask("Dexie: ".concat("readonly" === e ? "read" : "write", " ").concat(this.name));
				function a(e, t, n) {
					if (n.schema[i]) return r(n.idbtrans, n);
					throw new k.NotFound("Table " + i + " not part of transaction");
				}
				var u = $e();
				try {
					var s = n && n.db._novip === this.db._novip ? n === P.trans ? n._promise(e, a, t) : v(function() {
						return n._promise(e, a, t);
					}, {
						trans: n,
						transless: P.transless || P
					}) : function t(n, r, i, o) {
						if (n.idbdb && (n._state.openComplete || P.letThrough || n._vip)) {
							var a = n._createTransaction(r, i, n._dbSchema);
							try {
								a.create(), n._state.PR1398_maxLoop = 3;
							} catch (e) {
								return e.name === de.InvalidState && n.isOpen() && 0 < --n._state.PR1398_maxLoop ? (console.warn("Dexie: Need to reopen db"), n.close({ disableAutoOpen: !1 }), n.open().then(function() {
									return t(n, r, i, o);
								})) : S(e);
							}
							return a._promise(r, function(e, t) {
								return v(function() {
									return P.trans = a, o(e, t, a);
								});
							}).then(function(e) {
								if ("readwrite" === r) try {
									a.idbtrans.commit();
								} catch (e) {}
								return "readonly" === r ? e : a._completion.then(function() {
									return e;
								});
							});
						}
						if (n._state.openComplete) return S(new k.DatabaseClosed(n._state.dbOpenError));
						if (!n._state.isBeingOpened) {
							if (!n._state.autoOpen) return S(new k.DatabaseClosed());
							n.open().catch(g);
						}
						return n._state.dbReadyPromise.then(function() {
							return t(n, r, i, o);
						});
					}(this.db, e, [this.name], a);
					return o && (s._consoleTask = o, s = s.catch(function(e) {
						return console.trace(e), S(e);
					})), s;
				} finally {
					u && Qe();
				}
			}, r.prototype.get = function(t, e) {
				var n = this;
				return t && t.constructor === Object ? this.where(t).first(e) : null == t ? S(new k.Type("Invalid argument to Table.get()")) : this._trans("readonly", function(e) {
					return n.core.get({
						trans: e,
						key: t
					}).then(function(e) {
						return n.hook.reading.fire(e);
					});
				}).then(e);
			}, r.prototype.where = function(o) {
				if ("string" == typeof o) return new this.db.WhereClause(this, o);
				if (x(o)) return new this.db.WhereClause(this, "[".concat(o.join("+"), "]"));
				var n = O(o);
				if (1 === n.length) return this.where(n[0]).equals(o[n[0]]);
				var e = this.schema.indexes.concat(this.schema.primKey).filter(function(t) {
					if (t.compound && n.every(function(e) {
						return 0 <= t.keyPath.indexOf(e);
					})) {
						for (var e = 0; e < n.length; ++e) if (-1 === n.indexOf(t.keyPath[e])) return !1;
						return !0;
					}
					return !1;
				}).sort(function(e, t) {
					return e.keyPath.length - t.keyPath.length;
				})[0];
				if (e && this.db._maxKey !== ct) return t = e.keyPath.slice(0, n.length), this.where(t).equals(t.map(function(e) {
					return o[e];
				}));
				!e && l && console.warn("The query ".concat(JSON.stringify(o), " on ").concat(this.name, " would benefit from a ") + "compound index [".concat(n.join("+"), "]"));
				var a = this.schema.idxByName;
				function u(e, t) {
					return 0 === j(e, t);
				}
				var t = n.reduce(function(e, t) {
					var n = e[0], e = e[1], r = a[t], i = o[t];
					return [n || r, n || !r ? pt(e, r && r.multi ? function(e) {
						e = c(e, t);
						return x(e) && e.some(function(e) {
							return u(i, e);
						});
					} : function(e) {
						return u(i, c(e, t));
					}) : e];
				}, [null, null]), r = t[0], t = t[1];
				return r ? this.where(r.name).equals(o[r.keyPath]).filter(t) : e ? this.filter(t) : this.where(n).equals("");
			}, r.prototype.filter = function(e) {
				return this.toCollection().and(e);
			}, r.prototype.count = function(e) {
				return this.toCollection().count(e);
			}, r.prototype.offset = function(e) {
				return this.toCollection().offset(e);
			}, r.prototype.limit = function(e) {
				return this.toCollection().limit(e);
			}, r.prototype.each = function(e) {
				return this.toCollection().each(e);
			}, r.prototype.toArray = function(e) {
				return this.toCollection().toArray(e);
			}, r.prototype.toCollection = function() {
				return new this.db.Collection(new this.db.WhereClause(this));
			}, r.prototype.orderBy = function(e) {
				return new this.db.Collection(new this.db.WhereClause(this, x(e) ? "[".concat(e.join("+"), "]") : e));
			}, r.prototype.reverse = function() {
				return this.toCollection().reverse();
			}, r.prototype.mapToClass = function(r) {
				for (var o = this.db, a = this.name, i = ((this.schema.mappedClass = r).prototype instanceof mt && (r = ((e) => {
					var t = i, n = e;
					if ("function" != typeof n && null !== n) throw new TypeError("Class extends value " + String(n) + " is not a constructor or null");
					function r() {
						this.constructor = t;
					}
					function i() {
						return null !== e && e.apply(this, arguments) || this;
					}
					return B(t, n), t.prototype = null === n ? Object.create(n) : (r.prototype = n.prototype, new r()), Object.defineProperty(i.prototype, "db", {
						get: function() {
							return o;
						},
						enumerable: !1,
						configurable: !0
					}), i.prototype.table = function() {
						return a;
					}, i;
				})(r)), /* @__PURE__ */ new Set()), e = r.prototype; e; e = F(e)) Object.getOwnPropertyNames(e).forEach(function(e) {
					return i.add(e);
				});
				function t(e) {
					if (!e) return e;
					var t, n = Object.create(r.prototype);
					for (t in e) if (!i.has(t)) try {
						n[t] = e[t];
					} catch (e) {}
					return n;
				}
				return this.schema.readHook && this.hook.reading.unsubscribe(this.schema.readHook), this.schema.readHook = t, this.hook("reading", t), r;
			}, r.prototype.defineClass = function() {
				return this.mapToClass(function(e) {
					a(this, e);
				});
			}, r.prototype.add = function(t, n) {
				var r = this, e = this.schema.primKey, i = e.auto, o = e.keyPath, a = t;
				return o && i && (a = vt(o)(t)), this._trans("readwrite", function(e) {
					return r.core.mutate({
						trans: e,
						type: "add",
						keys: null != n ? [n] : null,
						values: [a]
					});
				}).then(function(e) {
					return e.numFailures ? K.reject(e.failures[0]) : e.lastResult;
				}).then(function(e) {
					if (o) try {
						b(t, o, e);
					} catch (e) {}
					return e;
				});
			}, r.prototype.upsert = function(r, i) {
				var o = this, a = this.schema.primKey.keyPath;
				return this._trans("readwrite", function(n) {
					return o.core.get({
						trans: n,
						key: r
					}).then(function(t) {
						var e = null != t ? t : {};
						return kt(e, i), a && b(e, a, r), o.core.mutate({
							trans: n,
							type: "put",
							values: [e],
							keys: [r],
							upsert: !0,
							updates: {
								keys: [r],
								changeSpecs: [i]
							}
						}).then(function(e) {
							return e.numFailures ? K.reject(e.failures[0]) : !!t;
						});
					});
				});
			}, r.prototype.update = function(e, t) {
				return "object" != typeof e || x(e) ? this.where(":id").equals(e).modify(t) : void 0 === (e = c(e, this.schema.primKey.keyPath)) ? S(new k.InvalidArgument("Given object does not contain its primary key")) : this.where(":id").equals(e).modify(t);
			}, r.prototype.put = function(t, n) {
				var r = this, e = this.schema.primKey, i = e.auto, o = e.keyPath, a = t;
				return o && i && (a = vt(o)(t)), this._trans("readwrite", function(e) {
					return r.core.mutate({
						trans: e,
						type: "put",
						values: [a],
						keys: null != n ? [n] : null
					});
				}).then(function(e) {
					return e.numFailures ? K.reject(e.failures[0]) : e.lastResult;
				}).then(function(e) {
					if (o) try {
						b(t, o, e);
					} catch (e) {}
					return e;
				});
			}, r.prototype.delete = function(t) {
				var n = this;
				return this._trans("readwrite", function(e) {
					return n.core.mutate({
						trans: e,
						type: "delete",
						keys: [t]
					}).then(function(e) {
						return wt(n, [t], e);
					}).then(function(e) {
						return e.numFailures ? K.reject(e.failures[0]) : void 0;
					});
				});
			}, r.prototype.clear = function() {
				var t = this;
				return this._trans("readwrite", function(e) {
					return t.core.mutate({
						trans: e,
						type: "deleteRange",
						range: yt
					}).then(function(e) {
						return wt(t, null, e);
					});
				}).then(function(e) {
					return e.numFailures ? K.reject(e.failures[0]) : void 0;
				});
			}, r.prototype.bulkGet = function(t) {
				var n = this;
				return this._trans("readonly", function(e) {
					return n.core.getMany({
						keys: t,
						trans: e
					}).then(function(e) {
						return e.map(function(e) {
							return n.hook.reading.fire(e);
						});
					});
				});
			}, r.prototype.bulkAdd = function(i, e, t) {
				var o = this, a = Array.isArray(e) ? e : void 0, u = (t = t || (a ? void 0 : e)) ? t.allKeys : void 0;
				return this._trans("readwrite", function(e) {
					var t = o.schema.primKey, n = t.auto, t = t.keyPath;
					if (t && a) throw new k.InvalidArgument("bulkAdd(): keys argument invalid on tables with inbound keys");
					if (a && a.length !== i.length) throw new k.InvalidArgument("Arguments objects and keys must have the same length");
					var r = i.length, n = t && n ? i.map(vt(t)) : i;
					return o.core.mutate({
						trans: e,
						type: "add",
						keys: a,
						values: n,
						wantResults: u
					}).then(function(e) {
						var t = e.numFailures, n = e.failures;
						if (0 === t) return u ? e.results : e.lastResult;
						throw new he("".concat(o.name, ".bulkAdd(): ").concat(t, " of ").concat(r, " operations failed"), n);
					});
				});
			}, r.prototype.bulkPut = function(i, e, t) {
				var o = this, a = Array.isArray(e) ? e : void 0, u = (t = t || (a ? void 0 : e)) ? t.allKeys : void 0;
				return this._trans("readwrite", function(e) {
					var t = o.schema.primKey, n = t.auto, t = t.keyPath;
					if (t && a) throw new k.InvalidArgument("bulkPut(): keys argument invalid on tables with inbound keys");
					if (a && a.length !== i.length) throw new k.InvalidArgument("Arguments objects and keys must have the same length");
					var r = i.length, n = t && n ? i.map(vt(t)) : i;
					return o.core.mutate({
						trans: e,
						type: "put",
						keys: a,
						values: n,
						wantResults: u
					}).then(function(e) {
						var t = e.numFailures, n = e.failures;
						if (0 === t) return u ? e.results : e.lastResult;
						throw new he("".concat(o.name, ".bulkPut(): ").concat(t, " of ").concat(r, " operations failed"), n);
					});
				});
			}, r.prototype.bulkUpdate = function(t) {
				var h = this, n = this.core, r = t.map(function(e) {
					return e.key;
				}), i = t.map(function(e) {
					return e.changes;
				}), d = [];
				return this._trans("readwrite", function(e) {
					return n.getMany({
						trans: e,
						keys: r,
						cache: "clone"
					}).then(function(c) {
						var l = [], f = [], s = (t.forEach(function(e, t) {
							var n = e.key, r = e.changes, i = c[t];
							if (i) {
								for (var o = 0, a = Object.keys(r); o < a.length; o++) {
									var u = a[o], s = r[u];
									if (u === h.schema.primKey.keyPath) {
										if (0 !== j(s, n)) throw new k.Constraint("Cannot update primary key in bulkUpdate()");
									} else b(i, u, s);
								}
								d.push(t), l.push(n), f.push(i);
							}
						}), l.length);
						return n.mutate({
							trans: e,
							type: "put",
							keys: l,
							values: f,
							updates: {
								keys: r,
								changeSpecs: i
							}
						}).then(function(e) {
							var t = e.numFailures, n = e.failures;
							if (0 === t) return s;
							for (var r = 0, i = Object.keys(n); r < i.length; r++) {
								var o, a = i[r], u = d[Number(a)];
								null != u && (o = n[a], delete n[a], n[u] = o);
							}
							throw new he("".concat(h.name, ".bulkUpdate(): ").concat(t, " of ").concat(s, " operations failed"), n);
						});
					});
				});
			}, r.prototype.bulkDelete = function(t) {
				var r = this, i = t.length;
				return this._trans("readwrite", function(e) {
					return r.core.mutate({
						trans: e,
						type: "delete",
						keys: t
					}).then(function(e) {
						return wt(r, t, e);
					});
				}).then(function(e) {
					var t = e.numFailures, n = e.failures;
					if (0 === t) return e.lastResult;
					throw new he("".concat(r.name, ".bulkDelete(): ").concat(t, " of ").concat(i, " operations failed"), n);
				});
			};
			var Ot = r;
			function r() {}
			function Pt(i) {
				function t(e, t) {
					if (t) {
						for (var n = arguments.length, r = new Array(n - 1); --n;) r[n - 1] = arguments[n];
						return a[e].subscribe.apply(null, r), i;
					}
					if ("string" == typeof e) return a[e];
				}
				var a = {};
				t.addEventType = u;
				for (var e = 1, n = arguments.length; e < n; ++e) u(arguments[e]);
				return t;
				function u(e, n, r) {
					var i, o;
					if ("object" != typeof e) return n = n || xe, o = {
						subscribers: [],
						fire: r = r || g,
						subscribe: function(e) {
							-1 === o.subscribers.indexOf(e) && (o.subscribers.push(e), o.fire = n(o.fire, e));
						},
						unsubscribe: function(t) {
							o.subscribers = o.subscribers.filter(function(e) {
								return e !== t;
							}), o.fire = o.subscribers.reduce(n, r);
						}
					}, a[e] = t[e] = o;
					O(i = e).forEach(function(e) {
						var t = i[e];
						if (x(t)) u(e, i[e][0], i[e][1]);
						else {
							if ("asap" !== t) throw new k.InvalidArgument("Invalid event config");
							var n = u(e, ve, function() {
								for (var e = arguments.length, t = new Array(e); e--;) t[e] = arguments[e];
								n.subscribers.forEach(function(e) {
									Q(function() {
										e.apply(null, t);
									});
								});
							});
						}
					});
				}
			}
			function Kt(e, t) {
				return U(t).from({ prototype: e }), t;
			}
			function Et(e, t) {
				return !(e.filter || e.algorithm || e.or) && (t ? e.justLimit : !e.replayFilter);
			}
			function St(e, t) {
				e.filter = pt(e.filter, t);
			}
			function At(e, t, n) {
				var r = e.replayFilter;
				e.replayFilter = r ? function() {
					return pt(r(), t());
				} : t, e.justLimit = n && !r;
			}
			function jt(e, t) {
				if (e.isPrimKey) return t.primaryKey;
				var n = t.getIndexByKeyPath(e.index);
				if (n) return n;
				throw new k.Schema("KeyPath " + e.index + " on object store " + t.name + " is not indexed");
			}
			function Ct(e, t, n) {
				var r = jt(e, t.schema);
				return t.openCursor({
					trans: n,
					values: !e.keysOnly,
					reverse: "prev" === e.dir,
					unique: !!e.unique,
					query: {
						index: r,
						range: e.range
					}
				});
			}
			function Tt(e, o, t, n) {
				var a, r, u = e.replayFilter ? pt(e.filter, e.replayFilter()) : e.filter;
				return e.or ? (a = {}, r = function(e, t, n) {
					var r, i;
					u && !u(t, n, function(e) {
						return t.stop(e);
					}, function(e) {
						return t.fail(e);
					}) || ("[object ArrayBuffer]" === (i = "" + (r = t.primaryKey)) && (i = "" + new Uint8Array(r)), m(a, i)) || (a[i] = !0, o(e, t, n));
				}, Promise.all([e.or._iterate(r, t), It(Ct(e, n, t), e.algorithm, r, !e.keysOnly && e.valueMapper)])) : It(Ct(e, n, t), pt(e.algorithm, u), o, !e.keysOnly && e.valueMapper);
			}
			function It(e, r, i, o) {
				var a = E(o ? function(e, t, n) {
					return i(o(e), t, n);
				} : i);
				return e.then(function(n) {
					if (n) return n.start(function() {
						var t = function() {
							return n.continue();
						};
						r && !r(n, function(e) {
							return t = e;
						}, function(e) {
							n.stop(e), t = g;
						}, function(e) {
							n.fail(e), t = g;
						}) || a(n.value, n, function(e) {
							return t = e;
						}), t();
					});
				});
			}
			i.prototype._read = function(e, t) {
				var n = this._ctx;
				return n.error ? n.table._trans(null, S.bind(null, n.error)) : n.table._trans("readonly", e).then(t);
			}, i.prototype._write = function(e) {
				var t = this._ctx;
				return t.error ? t.table._trans(null, S.bind(null, t.error)) : t.table._trans("readwrite", e, "locked");
			}, i.prototype._addAlgorithm = function(e) {
				var t = this._ctx;
				t.algorithm = pt(t.algorithm, e);
			}, i.prototype._iterate = function(e, t) {
				return Tt(this._ctx, e, t, this._ctx.table.core);
			}, i.prototype.clone = function(e) {
				var t = Object.create(this.constructor.prototype), n = Object.create(this._ctx);
				return e && a(n, e), t._ctx = n, t;
			}, i.prototype.raw = function() {
				return this._ctx.valueMapper = null, this;
			}, i.prototype.each = function(t) {
				var n = this._ctx;
				return this._read(function(e) {
					return Tt(n, t, e, n.table.core);
				});
			}, i.prototype.count = function(e) {
				var i = this;
				return this._read(function(e) {
					var t, n = i._ctx, r = n.table.core;
					return Et(n, !0) ? r.count({
						trans: e,
						query: {
							index: jt(n, r.schema),
							range: n.range
						}
					}).then(function(e) {
						return Math.min(e, n.limit);
					}) : (t = 0, Tt(n, function() {
						return ++t, !1;
					}, e, r).then(function() {
						return t;
					}));
				}).then(e);
			}, i.prototype.sortBy = function(e, t) {
				var n = e.split(".").reverse(), r = n[0], i = n.length - 1;
				function o(e, t) {
					return t ? o(e[n[t]], t - 1) : e[r];
				}
				var a = "next" === this._ctx.dir ? 1 : -1;
				function u(e, t) {
					return j(o(e, i), o(t, i)) * a;
				}
				return this.toArray(function(e) {
					return e.slice().sort(u);
				}).then(t);
			}, i.prototype.toArray = function(e) {
				var o = this;
				return this._read(function(e) {
					var t, n, r, i = o._ctx;
					return Et(i, !0) && 0 < i.limit ? (t = i.valueMapper, n = jt(i, i.table.core.schema), i.table.core.query({
						trans: e,
						limit: i.limit,
						values: !0,
						direction: "prev" === i.dir ? "prev" : void 0,
						query: {
							index: n,
							range: i.range
						}
					}).then(function(e) {
						e = e.result;
						return t ? e.map(t) : e;
					})) : (r = [], Tt(i, function(e) {
						return r.push(e);
					}, e, i.table.core).then(function() {
						return r;
					}));
				}, e);
			}, i.prototype.offset = function(t) {
				var e = this._ctx;
				return t <= 0 || (e.offset += t, Et(e) ? At(e, function() {
					var n = t;
					return function(e, t) {
						return 0 === n || (1 === n ? --n : t(function() {
							e.advance(n), n = 0;
						}), !1);
					};
				}) : At(e, function() {
					var e = t;
					return function() {
						return --e < 0;
					};
				})), this;
			}, i.prototype.limit = function(e) {
				return this._ctx.limit = Math.min(this._ctx.limit, e), At(this._ctx, function() {
					var r = e;
					return function(e, t, n) {
						return --r <= 0 && t(n), 0 <= r;
					};
				}, !0), this;
			}, i.prototype.until = function(r, i) {
				return St(this._ctx, function(e, t, n) {
					return !r(e.value) || (t(n), i);
				}), this;
			}, i.prototype.first = function(e) {
				return this.limit(1).toArray(function(e) {
					return e[0];
				}).then(e);
			}, i.prototype.last = function(e) {
				return this.reverse().first(e);
			}, i.prototype.filter = function(t) {
				var e;
				return St(this._ctx, function(e) {
					return t(e.value);
				}), (e = this._ctx).isMatch = pt(e.isMatch, t), this;
			}, i.prototype.and = function(e) {
				return this.filter(e);
			}, i.prototype.or = function(e) {
				return new this.db.WhereClause(this._ctx.table, e, this);
			}, i.prototype.reverse = function() {
				return this._ctx.dir = "prev" === this._ctx.dir ? "next" : "prev", this._ondirectionchange && this._ondirectionchange(this._ctx.dir), this;
			}, i.prototype.desc = function() {
				return this.reverse();
			}, i.prototype.eachKey = function(n) {
				var e = this._ctx;
				return e.keysOnly = !e.isMatch, this.each(function(e, t) {
					n(t.key, t);
				});
			}, i.prototype.eachUniqueKey = function(e) {
				return this._ctx.unique = "unique", this.eachKey(e);
			}, i.prototype.eachPrimaryKey = function(n) {
				var e = this._ctx;
				return e.keysOnly = !e.isMatch, this.each(function(e, t) {
					n(t.primaryKey, t);
				});
			}, i.prototype.keys = function(e) {
				var t = this._ctx, n = (t.keysOnly = !t.isMatch, []);
				return this.each(function(e, t) {
					n.push(t.key);
				}).then(function() {
					return n;
				}).then(e);
			}, i.prototype.primaryKeys = function(e) {
				var n = this._ctx;
				if (Et(n, !0) && 0 < n.limit) return this._read(function(e) {
					var t = jt(n, n.table.core.schema);
					return n.table.core.query({
						trans: e,
						values: !1,
						limit: n.limit,
						direction: "prev" === n.dir ? "prev" : void 0,
						query: {
							index: t,
							range: n.range
						}
					});
				}).then(function(e) {
					return e.result;
				}).then(e);
				n.keysOnly = !n.isMatch;
				var r = [];
				return this.each(function(e, t) {
					r.push(t.primaryKey);
				}).then(function() {
					return r;
				}).then(e);
			}, i.prototype.uniqueKeys = function(e) {
				return this._ctx.unique = "unique", this.keys(e);
			}, i.prototype.firstKey = function(e) {
				return this.limit(1).keys(function(e) {
					return e[0];
				}).then(e);
			}, i.prototype.lastKey = function(e) {
				return this.reverse().firstKey(e);
			}, i.prototype.distinct = function() {
				var n, e = this._ctx, e = e.index && e.table.schema.idxByName[e.index];
				return e && e.multi && (n = {}, St(this._ctx, function(e) {
					var e = e.primaryKey.toString(), t = m(n, e);
					return n[e] = !0, !t;
				})), this;
			}, i.prototype.modify = function(x) {
				var n = this, k = this._ctx;
				return this._write(function(p) {
					function y(e, t) {
						var n = t.failures;
						u += e - t.numFailures;
						for (var r = 0, i = O(n); r < i.length; r++) {
							var o = i[r];
							a.push(n[o]);
						}
					}
					var v = "function" == typeof x ? x : function(e) {
						return kt(e, x);
					}, m = k.table.core, e = m.schema.primaryKey, b = e.outbound, g = e.extractKey, w = 200, e = n.db._options.modifyChunkSize, a = (e && (w = "object" == typeof e ? e[m.name] || e["*"] || 200 : e), []), u = 0, t = [], _ = x === Dt;
					return n.clone().primaryKeys().then(function(f) {
						function h(s) {
							var c = Math.min(w, f.length - s), l = f.slice(s, s + c);
							return (_ ? Promise.resolve([]) : m.getMany({
								trans: p,
								keys: l,
								cache: "immutable"
							})).then(function(e) {
								var n = [], t = [], r = b ? [] : null, i = _ ? l : [];
								if (!_) for (var o = 0; o < c; ++o) {
									var a = e[o], u = {
										value: ee(a),
										primKey: f[s + o]
									};
									!1 !== v.call(u, u.value, u) && (null == u.value ? i.push(f[s + o]) : b || 0 === j(g(a), g(u.value)) ? (t.push(u.value), b && r.push(f[s + o])) : (i.push(f[s + o]), n.push(u.value)));
								}
								return Promise.resolve(0 < n.length && m.mutate({
									trans: p,
									type: "add",
									values: n
								}).then(function(e) {
									for (var t in e.failures) i.splice(parseInt(t), 1);
									y(n.length, e);
								})).then(function() {
									return (0 < t.length || d && "object" == typeof x) && m.mutate({
										trans: p,
										type: "put",
										keys: r,
										values: t,
										criteria: d,
										changeSpec: "function" != typeof x && x,
										isAdditionalChunk: 0 < s
									}).then(function(e) {
										return y(t.length, e);
									});
								}).then(function() {
									return (0 < i.length || d && _) && m.mutate({
										trans: p,
										type: "delete",
										keys: i,
										criteria: d,
										isAdditionalChunk: 0 < s
									}).then(function(e) {
										return wt(k.table, i, e);
									}).then(function(e) {
										return y(i.length, e);
									});
								}).then(function() {
									return f.length > s + c && h(s + w);
								});
							});
						}
						var d = Et(k) && k.limit === 1 / 0 && ("function" != typeof x || _) && {
							index: k.index,
							range: k.range
						};
						return h(0).then(function() {
							if (0 < a.length) throw new fe("Error modifying one or more objects", a, u, t);
							return f.length;
						});
					});
				});
			}, i.prototype.delete = function() {
				var i = this._ctx, n = i.range;
				return !Et(i) || i.table.schema.yProps || !i.isPrimKey && 3 !== n.type ? this.modify(Dt) : this._write(function(e) {
					var t = i.table.core.schema.primaryKey, r = n;
					return i.table.core.count({
						trans: e,
						query: {
							index: t,
							range: r
						}
					}).then(function(n) {
						return i.table.core.mutate({
							trans: e,
							type: "deleteRange",
							range: r
						}).then(function(e) {
							var t = e.failures, e = e.numFailures;
							if (e) throw new fe("Could not delete some values", Object.keys(t).map(function(e) {
								return t[e];
							}), n - e);
							return n - e;
						});
					});
				});
			};
			var qt = i;
			function i() {}
			var Dt = function(e, t) {
				return t.value = null;
			};
			function Bt(e, t) {
				return e < t ? -1 : e === t ? 0 : 1;
			}
			function Rt(e, t) {
				return t < e ? -1 : e === t ? 0 : 1;
			}
			function C(e, t, n) {
				e = e instanceof Lt ? new e.Collection(e) : e;
				return e._ctx.error = new (n || TypeError)(t), e;
			}
			function Ft(e) {
				return new e.Collection(e, function() {
					return Mt("");
				}).limit(0);
			}
			function Nt(e, s, n, r) {
				var i, c, l, f, h, d, p, y = n.length;
				if (!n.every(function(e) {
					return "string" == typeof e;
				})) return C(e, lt);
				function t(e) {
					i = "next" === e ? function(e) {
						return e.toUpperCase();
					} : function(e) {
						return e.toLowerCase();
					}, c = "next" === e ? function(e) {
						return e.toLowerCase();
					} : function(e) {
						return e.toUpperCase();
					}, l = "next" === e ? Bt : Rt;
					var t = n.map(function(e) {
						return {
							lower: c(e),
							upper: i(e)
						};
					}).sort(function(e, t) {
						return l(e.lower, t.lower);
					});
					f = t.map(function(e) {
						return e.upper;
					}), h = t.map(function(e) {
						return e.lower;
					}), p = "next" === (d = e) ? "" : r;
				}
				t("next");
				var e = new e.Collection(e, function() {
					return T(f[0], h[y - 1] + r);
				}), v = (e._ondirectionchange = function(e) {
					t(e);
				}, 0);
				return e._addAlgorithm(function(e, t, n) {
					var r = e.key;
					if ("string" == typeof r) {
						var i = c(r);
						if (s(i, h, v)) return !0;
						for (var o = null, a = v; a < y; ++a) {
							var u = ((e, t, n, r, i, o) => {
								for (var a = Math.min(e.length, r.length), u = -1, s = 0; s < a; ++s) {
									var c = t[s];
									if (c !== r[s]) return i(e[s], n[s]) < 0 ? e.substr(0, s) + n[s] + n.substr(s + 1) : i(e[s], r[s]) < 0 ? e.substr(0, s) + r[s] + n.substr(s + 1) : 0 <= u ? e.substr(0, u) + t[u] + n.substr(u + 1) : null;
									i(e[s], c) < 0 && (u = s);
								}
								return a < r.length && "next" === o ? e + n.substr(e.length) : a < e.length && "prev" === o ? e.substr(0, n.length) : u < 0 ? null : e.substr(0, u) + r[u] + n.substr(u + 1);
							})(r, i, f[a], h[a], l, d);
							null === u && null === o ? v = a + 1 : (null === o || 0 < l(o, u)) && (o = u);
						}
						t(null !== o ? function() {
							e.continue(o + p);
						} : n);
					}
					return !1;
				}), e;
			}
			function T(e, t, n, r) {
				return {
					type: 2,
					lower: e,
					upper: t,
					lowerOpen: n,
					upperOpen: r
				};
			}
			function Mt(e) {
				return {
					type: 1,
					lower: e,
					upper: e
				};
			}
			Object.defineProperty(d.prototype, "Collection", {
				get: function() {
					return this._ctx.table.db.Collection;
				},
				enumerable: !1,
				configurable: !0
			}), d.prototype.between = function(e, t, n, r) {
				n = !1 !== n, r = !0 === r;
				try {
					return 0 < this._cmp(e, t) || 0 === this._cmp(e, t) && (n || r) && (!n || !r) ? Ft(this) : new this.Collection(this, function() {
						return T(e, t, !n, !r);
					});
				} catch (e) {
					return C(this, A);
				}
			}, d.prototype.equals = function(e) {
				return null == e ? C(this, A) : new this.Collection(this, function() {
					return Mt(e);
				});
			}, d.prototype.above = function(e) {
				return null == e ? C(this, A) : new this.Collection(this, function() {
					return T(e, void 0, !0);
				});
			}, d.prototype.aboveOrEqual = function(e) {
				return null == e ? C(this, A) : new this.Collection(this, function() {
					return T(e, void 0, !1);
				});
			}, d.prototype.below = function(e) {
				return null == e ? C(this, A) : new this.Collection(this, function() {
					return T(void 0, e, !1, !0);
				});
			}, d.prototype.belowOrEqual = function(e) {
				return null == e ? C(this, A) : new this.Collection(this, function() {
					return T(void 0, e);
				});
			}, d.prototype.startsWith = function(e) {
				return "string" != typeof e ? C(this, lt) : this.between(e, e + ct, !0, !0);
			}, d.prototype.startsWithIgnoreCase = function(e) {
				return "" === e ? this.startsWith(e) : Nt(this, function(e, t) {
					return 0 === e.indexOf(t[0]);
				}, [e], ct);
			}, d.prototype.equalsIgnoreCase = function(e) {
				return Nt(this, function(e, t) {
					return e === t[0];
				}, [e], "");
			}, d.prototype.anyOfIgnoreCase = function() {
				var e = n.apply(ae, arguments);
				return 0 === e.length ? Ft(this) : Nt(this, function(e, t) {
					return -1 !== t.indexOf(e);
				}, e, "");
			}, d.prototype.startsWithAnyOfIgnoreCase = function() {
				var e = n.apply(ae, arguments);
				return 0 === e.length ? Ft(this) : Nt(this, function(t, e) {
					return e.some(function(e) {
						return 0 === t.indexOf(e);
					});
				}, e, ct);
			}, d.prototype.anyOf = function() {
				var e, i, t = this, o = n.apply(ae, arguments), a = this._cmp;
				try {
					o.sort(a);
				} catch (e) {
					return C(this, A);
				}
				return 0 === o.length ? Ft(this) : ((e = new this.Collection(this, function() {
					return T(o[0], o[o.length - 1]);
				}))._ondirectionchange = function(e) {
					a = "next" === e ? t._ascending : t._descending, o.sort(a);
				}, i = 0, e._addAlgorithm(function(e, t, n) {
					for (var r = e.key; 0 < a(r, o[i]);) if (++i === o.length) return t(n), !1;
					return 0 === a(r, o[i]) || (t(function() {
						e.continue(o[i]);
					}), !1);
				}), e);
			}, d.prototype.notEqual = function(e) {
				return this.inAnyRange([[-1 / 0, e], [e, this.db._maxKey]], {
					includeLowers: !1,
					includeUppers: !1
				});
			}, d.prototype.noneOf = function() {
				var e = n.apply(ae, arguments);
				if (0 === e.length) return new this.Collection(this);
				try {
					e.sort(this._ascending);
				} catch (e) {
					return C(this, A);
				}
				var t = e.reduce(function(e, t) {
					return e ? e.concat([[e[e.length - 1][1], t]]) : [[-1 / 0, t]];
				}, null);
				return t.push([e[e.length - 1], this.db._maxKey]), this.inAnyRange(t, {
					includeLowers: !1,
					includeUppers: !1
				});
			}, d.prototype.inAnyRange = function(e, t) {
				var o = this, a = this._cmp, u = this._ascending, n = this._descending, s = this._min, c = this._max;
				if (0 === e.length) return Ft(this);
				if (!e.every(function(e) {
					return void 0 !== e[0] && void 0 !== e[1] && u(e[0], e[1]) <= 0;
				})) return C(this, "First argument to inAnyRange() must be an Array of two-value Arrays [lower,upper] where upper must not be lower than lower", k.InvalidArgument);
				var r = !t || !1 !== t.includeLowers, i = t && !0 === t.includeUppers;
				var l, f = u;
				function h(e, t) {
					return f(e[0], t[0]);
				}
				try {
					(l = e.reduce(function(e, t) {
						for (var n = 0, r = e.length; n < r; ++n) {
							var i = e[n];
							if (a(t[0], i[1]) < 0 && 0 < a(t[1], i[0])) {
								i[0] = s(i[0], t[0]), i[1] = c(i[1], t[1]);
								break;
							}
						}
						return n === r && e.push(t), e;
					}, [])).sort(h);
				} catch (e) {
					return C(this, A);
				}
				var d = 0, p = i ? function(e) {
					return 0 < u(e, l[d][1]);
				} : function(e) {
					return 0 <= u(e, l[d][1]);
				}, y = r ? function(e) {
					return 0 < n(e, l[d][0]);
				} : function(e) {
					return 0 <= n(e, l[d][0]);
				};
				var v = p, t = new this.Collection(this, function() {
					return T(l[0][0], l[l.length - 1][1], !r, !i);
				});
				return t._ondirectionchange = function(e) {
					f = "next" === e ? (v = p, u) : (v = y, n), l.sort(h);
				}, t._addAlgorithm(function(e, t, n) {
					for (var r, i = e.key; v(i);) if (++d === l.length) return t(n), !1;
					return !p(r = i) && !y(r) || (0 === o._cmp(i, l[d][1]) || 0 === o._cmp(i, l[d][0]) || t(function() {
						f === u ? e.continue(l[d][0]) : e.continue(l[d][1]);
					}), !1);
				}), t;
			}, d.prototype.startsWithAnyOf = function() {
				var e = n.apply(ae, arguments);
				return e.every(function(e) {
					return "string" == typeof e;
				}) ? 0 === e.length ? Ft(this) : this.inAnyRange(e.map(function(e) {
					return [e, e + ct];
				})) : C(this, "startsWithAnyOf() only works with strings");
			};
			var Lt = d;
			function d() {}
			function I(t) {
				return E(function(e) {
					return Ut(e), t(e.target.error), !1;
				});
			}
			function Ut(e) {
				e.stopPropagation && e.stopPropagation(), e.preventDefault && e.preventDefault();
			}
			var zt = "storagemutated", Vt = "x-storagemutated-1", Wt = Pt(null, zt), Yt = (p.prototype._lock = function() {
				return $(!P.global), ++this._reculock, 1 !== this._reculock || P.global || (P.lockOwnerFor = this), this;
			}, p.prototype._unlock = function() {
				if ($(!P.global), 0 == --this._reculock) for (P.global || (P.lockOwnerFor = null); 0 < this._blockedFuncs.length && !this._locked();) {
					var e = this._blockedFuncs.shift();
					try {
						at(e[1], e[0]);
					} catch (e) {}
				}
				return this;
			}, p.prototype._locked = function() {
				return this._reculock && P.lockOwnerFor !== this;
			}, p.prototype.create = function(t) {
				var n = this;
				if (this.mode) {
					var e = this.db.idbdb, r = this.db._state.dbOpenError;
					if ($(!this.idbtrans), !t && !e) switch (r && r.name) {
						case "DatabaseClosedError": throw new k.DatabaseClosed(r);
						case "MissingAPIError": throw new k.MissingAPI(r.message, r);
						default: throw new k.OpenFailed(r);
					}
					if (!this.active) throw new k.TransactionInactive();
					$(null === this._completion._state), (t = this.idbtrans = t || (this.db.core || e).transaction(this.storeNames, this.mode, { durability: this.chromeTransactionDurability })).onerror = E(function(e) {
						Ut(e), n._reject(t.error);
					}), t.onabort = E(function(e) {
						Ut(e), n.active && n._reject(new k.Abort(t.error)), n.active = !1, n.on("abort").fire(e);
					}), t.oncomplete = E(function() {
						n.active = !1, n._resolve(), "mutatedParts" in t && Wt.storagemutated.fire(t.mutatedParts);
					});
				}
				return this;
			}, p.prototype._promise = function(n, r, i) {
				var e, o = this;
				return "readwrite" === n && "readwrite" !== this.mode ? S(new k.ReadOnly("Transaction is readonly")) : this.active ? this._locked() ? new K(function(e, t) {
					o._blockedFuncs.push([function() {
						o._promise(n, r, i).then(e, t);
					}, P]);
				}) : i ? v(function() {
					var e = new K(function(e, t) {
						o._lock();
						var n = r(e, t, o);
						n && n.then && n.then(e, t);
					});
					return e.finally(function() {
						return o._unlock();
					}), e._lib = !0, e;
				}) : ((e = new K(function(e, t) {
					var n = r(e, t, o);
					n && n.then && n.then(e, t);
				}))._lib = !0, e) : S(new k.TransactionInactive());
			}, p.prototype._root = function() {
				return this.parent ? this.parent._root() : this;
			}, p.prototype.waitFor = function(e) {
				var t, r = this._root(), i = K.resolve(e), o = (r._waitingFor ? r._waitingFor = r._waitingFor.then(function() {
					return i;
				}) : (r._waitingFor = i, r._waitingQueue = [], t = r.idbtrans.objectStore(r.storeNames[0]), function e() {
					for (++r._spinCount; r._waitingQueue.length;) r._waitingQueue.shift()();
					r._waitingFor && (t.get(-1 / 0).onsuccess = e);
				}()), r._waitingFor);
				return new K(function(t, n) {
					i.then(function(e) {
						return r._waitingQueue.push(E(t.bind(null, e)));
					}, function(e) {
						return r._waitingQueue.push(E(n.bind(null, e)));
					}).finally(function() {
						r._waitingFor === o && (r._waitingFor = null);
					});
				});
			}, p.prototype.abort = function() {
				this.active && (this.active = !1, this.idbtrans && this.idbtrans.abort(), this._reject(new k.Abort()));
			}, p.prototype.table = function(e) {
				var t = this._memoizedTables || (this._memoizedTables = {});
				if (m(t, e)) return t[e];
				var n = this.schema[e];
				if (n) return (n = new this.db.Table(e, n, this)).core = this.db.core.table(e), t[e] = n;
				throw new k.NotFound("Table " + e + " not part of transaction");
			}, p);
			function p() {}
			function $t(e, t, n, r, i, o, a, u) {
				return {
					name: e,
					keyPath: t,
					unique: n,
					multi: r,
					auto: i,
					compound: o,
					src: (n && !a ? "&" : "") + (r ? "*" : "") + (i ? "++" : "") + Qt(t),
					type: u
				};
			}
			function Qt(e) {
				return "string" == typeof e ? e : e ? "[" + [].join.call(e, "+") + "]" : "";
			}
			function Gt(e, t, n) {
				return {
					name: e,
					primKey: t,
					indexes: n,
					mappedClass: null,
					idxByName: (r = function(e) {
						return [e.name, e];
					}, n.reduce(function(e, t, n) {
						t = r(t, n);
						return t && (e[t[0]] = t[1]), e;
					}, {}))
				};
				var r;
			}
			var Xt = function(e) {
				try {
					return e.only([[]]), Xt = function() {
						return [[]];
					}, [[]];
				} catch (e) {
					return Xt = function() {
						return ct;
					}, ct;
				}
			};
			function Ht(t) {
				return null == t ? function() {} : "string" == typeof t ? 1 === (n = t).split(".").length ? function(e) {
					return e[n];
				} : function(e) {
					return c(e, n);
				} : function(e) {
					return c(e, t);
				};
				var n;
			}
			function Jt(e) {
				return [].slice.call(e);
			}
			var Zt = 0;
			function en(e) {
				return null == e ? ":id" : "string" == typeof e ? e : "[".concat(e.join("+"), "]");
			}
			function tn(e, i, t) {
				function _(e) {
					if (3 === e.type) return null;
					if (4 === e.type) throw new Error("Cannot convert never type to IDBKeyRange");
					var t = e.lower, n = e.upper, r = e.lowerOpen, e = e.upperOpen;
					return void 0 === t ? void 0 === n ? null : i.upperBound(n, !!e) : void 0 === n ? i.lowerBound(t, !!r) : i.bound(t, n, !!r, !!e);
				}
				function n(e) {
					var p, y, w = e.name;
					return {
						name: w,
						schema: e,
						mutate: function(e) {
							var y = e.trans, v = e.type, m = e.keys, b = e.values, g = e.range;
							return new Promise(function(t, e) {
								t = E(t);
								var n = y.objectStore(w), r = null == n.keyPath, i = "put" === v || "add" === v;
								if (!i && "delete" !== v && "deleteRange" !== v) throw new Error("Invalid operation type: " + v);
								var o, a = (m || b || { length: 1 }).length;
								if (m && b && m.length !== b.length) throw new Error("Given keys array must have same length as given values array.");
								if (0 === a) return t({
									numFailures: 0,
									failures: {},
									results: [],
									lastResult: void 0
								});
								function u(e) {
									++l, Ut(e);
								}
								var s = [], c = [], l = 0;
								if ("deleteRange" === v) {
									if (4 === g.type) return t({
										numFailures: l,
										failures: c,
										results: [],
										lastResult: void 0
									});
									3 === g.type ? s.push(o = n.clear()) : s.push(o = n.delete(_(g)));
								} else {
									var r = i ? r ? [b, m] : [b, null] : [m, null], f = r[0], h = r[1];
									if (i) for (var d = 0; d < a; ++d) s.push(o = h && void 0 !== h[d] ? n[v](f[d], h[d]) : n[v](f[d])), o.onerror = u;
									else for (d = 0; d < a; ++d) s.push(o = n[v](f[d])), o.onerror = u;
								}
								function p(e) {
									e = e.target.result, s.forEach(function(e, t) {
										return null != e.error && (c[t] = e.error);
									}), t({
										numFailures: l,
										failures: c,
										results: "delete" === v ? m : s.map(function(e) {
											return e.result;
										}),
										lastResult: e
									});
								}
								o.onerror = function(e) {
									u(e), p(e);
								}, o.onsuccess = p;
							});
						},
						getMany: function(e) {
							var f = e.trans, h = e.keys;
							return new Promise(function(t, e) {
								t = E(t);
								for (var n, r = f.objectStore(w), i = h.length, o = new Array(i), a = 0, u = 0, s = function(e) {
									e = e.target;
									o[e._pos] = e.result, ++u === a && t(o);
								}, c = I(e), l = 0; l < i; ++l) null != h[l] && ((n = r.get(h[l]))._pos = l, n.onsuccess = s, n.onerror = c, ++a);
								0 === a && t(o);
							});
						},
						get: function(e) {
							var r = e.trans, i = e.key;
							return new Promise(function(t, e) {
								t = E(t);
								var n = r.objectStore(w).get(i);
								n.onsuccess = function(e) {
									return t(e.target.result);
								}, n.onerror = I(e);
							});
						},
						query: (p = a, y = u, function(d) {
							return new Promise(function(t, e) {
								t = E(t);
								var n, r, i, o, a = d.trans, u = d.values, s = d.limit, c = d.query, l = null != (l = d.direction) ? l : "next", f = s === 1 / 0 ? void 0 : s, h = c.index, c = c.range, a = a.objectStore(w), a = h.isPrimaryKey ? a : a.index(h.name), h = _(c);
								if (0 === s) return t({ result: [] });
								y ? (c = {
									query: h,
									count: f,
									direction: l
								}, (n = u ? a.getAll(c) : a.getAllKeys(c)).onsuccess = function(e) {
									return t({ result: e.target.result });
								}, n.onerror = I(e)) : p && "next" === l ? ((n = u ? a.getAll(h, f) : a.getAllKeys(h, f)).onsuccess = function(e) {
									return t({ result: e.target.result });
								}, n.onerror = I(e)) : (r = 0, i = !u && "openKeyCursor" in a ? a.openKeyCursor(h, l) : a.openCursor(h, l), o = [], i.onsuccess = function() {
									var e = i.result;
									return !e || (o.push(u ? e.value : e.primaryKey), ++r === s) ? t({ result: o }) : void e.continue();
								}, i.onerror = I(e));
							});
						}),
						openCursor: function(e) {
							var c = e.trans, o = e.values, a = e.query, u = e.reverse, l = e.unique;
							return new Promise(function(t, n) {
								t = E(t);
								var e = a.index, r = a.range, i = c.objectStore(w), i = e.isPrimaryKey ? i : i.index(e.name), e = u ? l ? "prevunique" : "prev" : l ? "nextunique" : "next", s = !o && "openKeyCursor" in i ? i.openKeyCursor(_(r), e) : i.openCursor(_(r), e);
								s.onerror = I(n), s.onsuccess = E(function(e) {
									var r, i, o, a, u = s.result;
									u ? (u.___id = ++Zt, u.done = !1, r = u.continue.bind(u), i = (i = u.continuePrimaryKey) && i.bind(u), o = u.advance.bind(u), a = function() {
										throw new Error("Cursor not stopped");
									}, u.trans = c, u.stop = u.continue = u.continuePrimaryKey = u.advance = function() {
										throw new Error("Cursor not started");
									}, u.fail = E(n), u.next = function() {
										var e = this, t = 1;
										return this.start(function() {
											return t-- ? e.continue() : e.stop();
										}).then(function() {
											return e;
										});
									}, u.start = function(e) {
										function t() {
											if (s.result) try {
												e();
											} catch (e) {
												u.fail(e);
											}
											else u.done = !0, u.start = function() {
												throw new Error("Cursor behind last entry");
											}, u.stop();
										}
										var n = new Promise(function(t, e) {
											t = E(t), s.onerror = I(e), u.fail = e, u.stop = function(e) {
												u.stop = u.continue = u.continuePrimaryKey = u.advance = a, t(e);
											};
										});
										return s.onsuccess = E(function(e) {
											s.onsuccess = t, t();
										}), u.continue = r, u.continuePrimaryKey = i, u.advance = o, t(), n;
									}, t(u)) : t(null);
								}, n);
							});
						},
						count: function(e) {
							var t = e.query, i = e.trans, o = t.index, a = t.range;
							return new Promise(function(t, e) {
								var n = i.objectStore(w), n = o.isPrimaryKey ? n : n.index(o.name), r = _(a), r = r ? n.count(r) : n.count();
								r.onsuccess = E(function(e) {
									return t(e.target.result);
								}), r.onerror = I(e);
							});
						}
					};
				}
				r = t, o = Jt((t = e).objectStoreNames), s = 0 < o.length ? r.objectStore(o[0]) : {};
				var r, t = {
					schema: {
						name: t.name,
						tables: o.map(function(e) {
							return r.objectStore(e);
						}).map(function(t) {
							var e = t.keyPath, n = t.autoIncrement, r = x(e), i = {}, r = {
								name: t.name,
								primaryKey: {
									name: null,
									isPrimaryKey: !0,
									outbound: null == e,
									compound: r,
									keyPath: e,
									autoIncrement: n,
									unique: !0,
									extractKey: Ht(e)
								},
								indexes: Jt(t.indexNames).map(function(e) {
									return t.index(e);
								}).map(function(e) {
									var t = e.name, n = e.unique, r = e.multiEntry, e = e.keyPath, t = {
										name: t,
										compound: x(e),
										keyPath: e,
										unique: n,
										multiEntry: r,
										extractKey: Ht(e)
									};
									return i[en(e)] = t;
								}),
								getIndexByKeyPath: function(e) {
									return i[en(e)];
								}
							};
							return i[":id"] = r.primaryKey, null != e && (i[en(e)] = r.primaryKey), r;
						})
					},
					hasGetAll: 0 < o.length && "getAll" in s && !("undefined" != typeof navigator && /Safari/.test(navigator.userAgent) && !/(Chrome\/|Edge\/)/.test(navigator.userAgent) && [].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1] < 604),
					hasIdb3Features: "getAllRecords" in s
				}, o = t.schema, a = t.hasGetAll, u = t.hasIdb3Features, s = o.tables.map(n), c = {};
				return s.forEach(function(e) {
					return c[e.name] = e;
				}), {
					stack: "dbcore",
					transaction: e.transaction.bind(e),
					table: function(e) {
						if (c[e]) return c[e];
						throw new Error("Table '".concat(e, "' not found"));
					},
					MIN_KEY: -1 / 0,
					MAX_KEY: Xt(i),
					schema: o
				};
			}
			function nn(e, t, n, r) {
				n = n.IDBKeyRange;
				return t = tn(t, n, r), { dbcore: e.dbcore.reduce(function(e, t) {
					t = t.create;
					return _(_({}, e), t(e));
				}, t) };
			}
			function rn(n, e) {
				var t = e.db, t = nn(n._middlewares, t, n._deps, e);
				n.core = t.dbcore, n.tables.forEach(function(e) {
					var t = e.name;
					n.core.schema.tables.some(function(e) {
						return e.name === t;
					}) && (e.core = n.core.table(t), n[t] instanceof n.Table) && (n[t].core = e.core);
				});
			}
			function on(i, e, t, o) {
				t.forEach(function(n) {
					var r = o[n];
					e.forEach(function(e) {
						var t = function e(t, n) {
							return z(t, n) || (t = F(t)) && e(t, n);
						}(e, n);
						(!t || "value" in t && void 0 === t.value) && (e === i.Transaction.prototype || e instanceof i.Transaction ? u(e, n, {
							get: function() {
								return this.table(n);
							},
							set: function(e) {
								L(this, n, {
									value: e,
									writable: !0,
									configurable: !0,
									enumerable: !0
								});
							}
						}) : e[n] = new i.Table(n, r));
					});
				});
			}
			function an(n, e) {
				e.forEach(function(e) {
					for (var t in e) e[t] instanceof n.Table && delete e[t];
				});
			}
			function un(e, t) {
				return e._cfg.version - t._cfg.version;
			}
			function sn(n, r, i, e) {
				var o = n._dbSchema, a = (i.objectStoreNames.contains("$meta") && !o.$meta && (o.$meta = Gt("$meta", vn("")[0], []), n._storeNames.push("$meta")), n._createTransaction("readwrite", n._storeNames, o)), u = (a.create(i), a._completion.catch(e), a._reject.bind(a)), s = P.transless || P;
				v(function() {
					if (P.trans = a, P.transless = s, 0 !== r) return rn(n, i), t = r, ((e = a).storeNames.includes("$meta") ? e.table("$meta").get("version").then(function(e) {
						return null != e ? e : t;
					}) : K.resolve(t)).then(function(e) {
						var s = n, c = e, l = a, f = i, t = [], e = s._versions, h = s._dbSchema = pn(0, s.idbdb, f);
						return 0 === (e = e.filter(function(e) {
							return e._cfg.version >= c;
						})).length ? K.resolve() : (e.forEach(function(u) {
							t.push(function() {
								var t, n, r, i = h, e = u._cfg.dbschema, o = (yn(s, i, f), yn(s, e, f), h = s._dbSchema = e, ln(i, e)), a = (o.add.forEach(function(e) {
									fn(f, e[0], e[1].primKey, e[1].indexes);
								}), o.change.forEach(function(e) {
									if (e.recreate) throw new k.Upgrade("Not yet support for changing primary key");
									var t = f.objectStore(e.name);
									e.add.forEach(function(e) {
										return dn(t, e);
									}), e.change.forEach(function(e) {
										t.deleteIndex(e.name), dn(t, e);
									}), e.del.forEach(function(e) {
										return t.deleteIndex(e);
									});
								}), u._cfg.contentUpgrade);
								if (a && u._cfg.version > c) return rn(s, f), l._memoizedTables = {}, t = G(e), o.del.forEach(function(e) {
									t[e] = i[e];
								}), an(s, [s.Transaction.prototype]), on(s, [s.Transaction.prototype], O(t), t), l.schema = t, (n = ue(a)) && nt(), e = K.follow(function() {
									var e;
									(r = a(l)) && n && (e = w.bind(null, null), r.then(e, e));
								}), r && "function" == typeof r.then ? K.resolve(r) : e.then(function() {
									return r;
								});
							}), t.push(function(e) {
								var t = u._cfg.dbschema, n = e;
								[].slice.call(n.db.objectStoreNames).forEach(function(e) {
									return null == t[e] && n.db.deleteObjectStore(e);
								}), an(s, [s.Transaction.prototype]), on(s, [s.Transaction.prototype], s._storeNames, s._dbSchema), l.schema = s._dbSchema;
							}), t.push(function(e) {
								s.idbdb.objectStoreNames.contains("$meta") && (Math.ceil(s.idbdb.version / 10) === u._cfg.version ? (s.idbdb.deleteObjectStore("$meta"), delete s._dbSchema.$meta, s._storeNames = s._storeNames.filter(function(e) {
									return "$meta" !== e;
								})) : e.objectStore("$meta").put(u._cfg.version, "version"));
							});
						}), function e() {
							return t.length ? K.resolve(t.shift()(l.idbtrans)).then(e) : K.resolve();
						}().then(function() {
							hn(h, f);
						}));
					}).catch(u);
					var e, t;
					O(o).forEach(function(e) {
						fn(i, e, o[e].primKey, o[e].indexes);
					}), rn(n, i), K.follow(function() {
						return n.on.populate.fire(a);
					}).catch(u);
				});
			}
			function cn(e, r) {
				hn(e._dbSchema, r), r.db.version % 10 != 0 || r.objectStoreNames.contains("$meta") || r.db.createObjectStore("$meta").add(Math.ceil(r.db.version / 10 - 1), "version");
				var t = pn(0, e.idbdb, r);
				yn(e, e._dbSchema, r);
				for (var n = 0, i = ln(t, e._dbSchema).change; n < i.length; n++) {
					var o = ((t) => {
						if (t.change.length || t.recreate) return console.warn("Unable to patch indexes of table ".concat(t.name, " because it has changes on the type of index or primary key.")), { value: void 0 };
						var n = r.objectStore(t.name);
						t.add.forEach(function(e) {
							l && console.debug("Dexie upgrade patch: Creating missing index ".concat(t.name, ".").concat(e.src)), dn(n, e);
						});
					})(i[n]);
					if ("object" == typeof o) return o.value;
				}
			}
			function ln(e, t) {
				var n, r = {
					del: [],
					add: [],
					change: []
				};
				for (n in e) t[n] || r.del.push(n);
				for (n in t) {
					var i = e[n], o = t[n];
					if (i) {
						var a = {
							name: n,
							def: o,
							recreate: !1,
							del: [],
							add: [],
							change: []
						};
						if ("" + (i.primKey.keyPath || "") != "" + (o.primKey.keyPath || "") || i.primKey.auto !== o.primKey.auto) a.recreate = !0, r.change.push(a);
						else {
							var u = i.idxByName, s = o.idxByName, c = void 0;
							for (c in u) s[c] || a.del.push(c);
							for (c in s) {
								var l = u[c], f = s[c];
								l ? l.src !== f.src && a.change.push(f) : a.add.push(f);
							}
							(0 < a.del.length || 0 < a.add.length || 0 < a.change.length) && r.change.push(a);
						}
					} else r.add.push([n, o]);
				}
				return r;
			}
			function fn(e, t, n, r) {
				var i = e.db.createObjectStore(t, n.keyPath ? {
					keyPath: n.keyPath,
					autoIncrement: n.auto
				} : { autoIncrement: n.auto });
				r.forEach(function(e) {
					return dn(i, e);
				});
			}
			function hn(t, n) {
				O(t).forEach(function(e) {
					n.db.objectStoreNames.contains(e) || (l && console.debug("Dexie: Creating missing table", e), fn(n, e, t[e].primKey, t[e].indexes));
				});
			}
			function dn(e, t) {
				e.createIndex(t.name, t.keyPath, {
					unique: t.unique,
					multiEntry: t.multi
				});
			}
			function pn(e, t, u) {
				var s = {};
				return W(t.objectStoreNames, 0).forEach(function(e) {
					for (var t = u.objectStore(e), n = $t(Qt(a = t.keyPath), a || "", !0, !1, !!t.autoIncrement, a && "string" != typeof a, !0), r = [], i = 0; i < t.indexNames.length; ++i) {
						var o = t.index(t.indexNames[i]), a = o.keyPath, o = $t(o.name, a, !!o.unique, !!o.multiEntry, !1, a && "string" != typeof a, !1);
						r.push(o);
					}
					s[e] = Gt(e, n, r);
				}), s;
			}
			function yn(e, t, n) {
				for (var r = n.db.objectStoreNames, i = 0; i < r.length; ++i) {
					var o = r[i], a = n.objectStore(o);
					e._hasGetAll = "getAll" in a;
					for (var u = 0; u < a.indexNames.length; ++u) {
						var s, c = a.indexNames[u], l = a.index(c).keyPath, l = "string" == typeof l ? l : "[" + W(l).join("+") + "]";
						t[o] && (s = t[o].idxByName[l]) && (s.name = c, delete t[o].idxByName[l], t[o].idxByName[c] = s);
					}
				}
				"undefined" != typeof navigator && /Safari/.test(navigator.userAgent) && !/(Chrome\/|Edge\/)/.test(navigator.userAgent) && f.WorkerGlobalScope && f instanceof f.WorkerGlobalScope && [].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1] < 604 && (e._hasGetAll = !1);
			}
			function vn(e) {
				return e.split(",").map(function(e, t) {
					var n = e.split(":"), r = null == (r = n[1]) ? void 0 : r.trim(), n = (e = n[0].trim()).replace(/([&*]|\+\+)/g, ""), i = /^\[/.test(n) ? n.match(/^\[(.*)\]$/)[1].split("+") : n;
					return $t(n, i || null, /\&/.test(e), /\*/.test(e), /\+\+/.test(e), x(i), 0 === t, r);
				});
			}
			bn.prototype._createTableSchema = Gt, bn.prototype._parseIndexSyntax = vn, bn.prototype._parseStoresSpec = function(r, i) {
				var o = this;
				O(r).forEach(function(e) {
					if (null !== r[e]) {
						var t = o._parseIndexSyntax(r[e]), n = t.shift();
						if (!n) throw new k.Schema("Invalid schema for table " + e + ": " + r[e]);
						if (n.unique = !0, n.multi) throw new k.Schema("Primary key cannot be multiEntry*");
						t.forEach(function(e) {
							if (e.auto) throw new k.Schema("Only primary key can be marked as autoIncrement (++)");
							if (!e.keyPath) throw new k.Schema("Index must have a name and cannot be an empty string");
						});
						n = o._createTableSchema(e, n, t);
						i[e] = n;
					}
				});
			}, bn.prototype.stores = function(e) {
				var t = this.db, e = (this._cfg.storesSource = this._cfg.storesSource ? a(this._cfg.storesSource, e) : e, t._versions), n = {}, r = {};
				return e.forEach(function(e) {
					a(n, e._cfg.storesSource), r = e._cfg.dbschema = {}, e._parseStoresSpec(n, r);
				}), t._dbSchema = r, an(t, [
					t._allTables,
					t,
					t.Transaction.prototype
				]), on(t, [
					t._allTables,
					t,
					t.Transaction.prototype,
					this._cfg.tables
				], O(r), r), t._storeNames = O(r), this;
			}, bn.prototype.upgrade = function(e) {
				return this._cfg.contentUpgrade = ke(this._cfg.contentUpgrade || g, e), this;
			};
			var mn = bn;
			function bn() {}
			var gn = (() => {
				var i, o, t;
				return "undefined" != typeof FinalizationRegistry && "undefined" != typeof WeakRef ? (i = /* @__PURE__ */ new Set(), o = new FinalizationRegistry(function(e) {
					i.delete(e);
				}), {
					toArray: function() {
						return Array.from(i).map(function(e) {
							return e.deref();
						}).filter(function(e) {
							return void 0 !== e;
						});
					},
					add: function(e) {
						var t = new WeakRef(e._novip);
						i.add(t), o.register(e._novip, t, t), i.size > e._options.maxConnections && (t = i.values().next().value, i.delete(t), o.unregister(t));
					},
					remove: function(e) {
						if (e) for (var t = i.values(), n = t.next(); !n.done;) {
							var r = n.value;
							if (r.deref() === e._novip) return i.delete(r), void o.unregister(r);
							n = t.next();
						}
					}
				}) : (t = [], {
					toArray: function() {
						return t;
					},
					add: function(e) {
						t.push(e._novip);
					},
					remove: function(e) {
						e && -1 !== (e = t.indexOf(e._novip)) && t.splice(e, 1);
					}
				});
			})();
			function wn(e, t) {
				var n = e._dbNamesDB;
				return n || (n = e._dbNamesDB = new y(ft, {
					addons: [],
					indexedDB: e,
					IDBKeyRange: t
				})).version(1).stores({ dbnames: "name" }), n.table("dbnames");
			}
			function _n(e) {
				return e && "function" == typeof e.databases;
			}
			function xn(e) {
				return v(function() {
					return P.letThrough = !0, e();
				});
			}
			function kn(e) {
				return !("from" in e);
			}
			var q = function(e, t) {
				var n;
				if (!this) return n = new q(), e && "d" in e && a(n, e), n;
				a(this, arguments.length ? {
					d: 1,
					from: e,
					to: 1 < arguments.length ? t : e
				} : { d: 0 });
			};
			function On(e, t, n) {
				var r = j(t, n);
				if (!isNaN(r)) {
					if (0 < r) throw RangeError();
					if (kn(e)) return a(e, {
						from: t,
						to: n,
						d: 1
					});
					var r = e.l, i = e.r;
					if (j(n, e.from) < 0) return r ? On(r, t, n) : e.l = {
						from: t,
						to: n,
						d: 1,
						l: null,
						r: null
					}, Sn(e);
					if (0 < j(t, e.to)) return i ? On(i, t, n) : e.r = {
						from: t,
						to: n,
						d: 1,
						l: null,
						r: null
					}, Sn(e);
					j(t, e.from) < 0 && (e.from = t, e.l = null, e.d = i ? i.d + 1 : 1), 0 < j(n, e.to) && (e.to = n, e.r = null, e.d = e.l ? e.l.d + 1 : 1);
					t = !e.r;
					r && !e.l && Pn(e, r), i && t && Pn(e, i);
				}
			}
			function Pn(e, t) {
				kn(t) || function e(t, n) {
					var r = n.from, i = n.l, o = n.r;
					On(t, r, n.to), i && e(t, i), o && e(t, o);
				}(e, t);
			}
			function Kn(e, t) {
				var n = En(t), r = n.next();
				if (!r.done) for (var i = r.value, o = En(e), a = o.next(i.from), u = a.value; !r.done && !a.done;) {
					if (j(u.from, i.to) <= 0 && 0 <= j(u.to, i.from)) return !0;
					j(i.from, u.from) < 0 ? i = (r = n.next(u.from)).value : u = (a = o.next(i.from)).value;
				}
				return !1;
			}
			function En(e) {
				var n = kn(e) ? null : {
					s: 0,
					n: e
				};
				return { next: function(e) {
					for (var t = 0 < arguments.length; n;) switch (n.s) {
						case 0: if (n.s = 1, t) for (; n.n.l && j(e, n.n.from) < 0;) n = {
							up: n,
							n: n.n.l,
							s: 1
						};
						else for (; n.n.l;) n = {
							up: n,
							n: n.n.l,
							s: 1
						};
						case 1: if (n.s = 2, !t || j(e, n.n.to) <= 0) return {
							value: n.n,
							done: !1
						};
						case 2: if (n.n.r) {
							n.s = 3, n = {
								up: n,
								n: n.n.r,
								s: 0
							};
							continue;
						}
						case 3: n = n.up;
					}
					return { done: !0 };
				} };
			}
			function Sn(e) {
				var t, n, r, i = ((null == (i = e.r) ? void 0 : i.d) || 0) - ((null == (i = e.l) ? void 0 : i.d) || 0), i = 1 < i ? "r" : i < -1 ? "l" : "";
				i && (t = "r" == i ? "l" : "r", n = _({}, e), r = e[i], e.from = r.from, e.to = r.to, e[i] = r[i], n[i] = r[t], (e[t] = n).d = An(n)), e.d = An(e);
			}
			function An(e) {
				var t = e.r, e = e.l;
				return (t ? e ? Math.max(t.d, e.d) : t.d : e ? e.d : 0) + 1;
			}
			function jn(t, n) {
				return O(n).forEach(function(e) {
					t[e] ? Pn(t[e], n[e]) : t[e] = function e(t) {
						var n, r, i = {};
						for (n in t) m(t, n) && (r = t[n], i[n] = !r || "object" != typeof r || J.has(r.constructor) ? r : e(r));
						return i;
					}(n[e]);
				}), t;
			}
			function Cn(t, n) {
				return t.all || n.all || Object.keys(t).some(function(e) {
					return n[e] && Kn(n[e], t[e]);
				});
			}
			M(q.prototype, ((t = {
				add: function(e) {
					return Pn(this, e), this;
				},
				addKey: function(e) {
					return On(this, e, e), this;
				},
				addKeys: function(e) {
					var t = this;
					return e.forEach(function(e) {
						return On(t, e, e);
					}), this;
				},
				hasKey: function(e) {
					var t = En(this).next(e).value;
					return t && j(t.from, e) <= 0 && 0 <= j(t.to, e);
				}
			})[re] = function() {
				return En(this);
			}, t));
			var Tn = {}, In = {}, qn = !1;
			function Dn(e) {
				jn(In, e), qn || (qn = !0, setTimeout(function() {
					qn = !1, Bn(In, !(In = {}));
				}, 0));
			}
			function Bn(e, t) {
				void 0 === t && (t = !1);
				var n = /* @__PURE__ */ new Set();
				if (e.all) for (var r = 0, i = Object.values(Tn); r < i.length; r++) Rn(u = i[r], e, n, t);
				else for (var o in e) {
					var a, u, o = /^idb\:\/\/(.*)\/(.*)\//.exec(o);
					o && (a = o[1], o = o[2], u = Tn["idb://".concat(a, "/").concat(o)]) && Rn(u, e, n, t);
				}
				n.forEach(function(e) {
					return e();
				});
			}
			function Rn(e, t, n, r) {
				for (var i = [], o = 0, a = Object.entries(e.queries.query); o < a.length; o++) {
					for (var u = a[o], s = u[0], c = [], l = 0, f = u[1]; l < f.length; l++) {
						var h = f[l];
						Cn(t, h.obsSet) ? h.subscribers.forEach(function(e) {
							return n.add(e);
						}) : r && c.push(h);
					}
					r && i.push([s, c]);
				}
				if (r) for (var d = 0, p = i; d < p.length; d++) {
					var y = p[d], s = y[0], c = y[1];
					e.queries.query[s] = c;
				}
			}
			function Fn(h) {
				var d = h._state, r = h._deps.indexedDB;
				if (d.isBeingOpened || h.idbdb) return d.dbReadyPromise.then(function() {
					return d.dbOpenError ? S(d.dbOpenError) : h;
				});
				d.isBeingOpened = !0, d.dbOpenError = null, d.openComplete = !1;
				var t = d.openCanceller, p = Math.round(10 * h.verno), y = !1;
				function e() {
					if (d.openCanceller !== t) throw new k.DatabaseClosed("db.open() was cancelled");
				}
				function v() {
					return new K(function(c, n) {
						if (e(), !r) throw new k.MissingAPI();
						var l = h.name, f = d.autoSchema || !p ? r.open(l) : r.open(l, p);
						if (!f) throw new k.MissingAPI();
						f.onerror = I(n), f.onblocked = E(h._fireOnBlocked), f.onupgradeneeded = E(function(e) {
							var t;
							m = f.transaction, d.autoSchema && !h._options.allowEmptyDB ? (f.onerror = Ut, m.abort(), f.result.close(), (t = r.deleteDatabase(l)).onsuccess = t.onerror = E(function() {
								n(new k.NoSuchDatabase("Database ".concat(l, " doesnt exist")));
							})) : (m.onerror = I(n), t = e.oldVersion > Math.pow(2, 62) ? 0 : e.oldVersion, b = t < 1, h.idbdb = f.result, y && cn(h, m), sn(h, t / 10, m, n));
						}, n), f.onsuccess = E(function() {
							m = null;
							var e, t, n, r, i, o, a = h.idbdb = f.result, u = W(a.objectStoreNames);
							if (0 < u.length) try {
								var s = a.transaction(1 === (i = u).length ? i[0] : i, "readonly");
								if (d.autoSchema) o = a, r = s, (n = h).verno = o.version / 10, r = n._dbSchema = pn(0, o, r), n._storeNames = W(o.objectStoreNames, 0), on(n, [n._allTables], O(r), r);
								else if (yn(h, h._dbSchema, s), t = s, ((t = ln(pn(0, (e = h).idbdb, t), e._dbSchema)).add.length || t.change.some(function(e) {
									return e.add.length || e.change.length;
								})) && !y) return console.warn("Dexie SchemaDiff: Schema was extended without increasing the number passed to db.version(). Dexie will add missing parts and increment native version number to workaround this."), a.close(), p = a.version + 1, y = !0, c(v());
								rn(h, s);
							} catch (e) {}
							gn.add(h), a.onversionchange = E(function(e) {
								d.vcFired = !0, h.on("versionchange").fire(e);
							}), a.onclose = E(function() {
								h.close({ disableAutoOpen: !1 });
							}), b && (u = h._deps, i = l, _n(o = u.indexedDB) || i === ft || wn(o, u.IDBKeyRange).put({ name: i }).catch(g)), c();
						}, n);
					}).catch(function(e) {
						switch (null == e ? void 0 : e.name) {
							case "UnknownError":
								if (0 < d.PR1398_maxLoop) return d.PR1398_maxLoop--, console.warn("Dexie: Workaround for Chrome UnknownError on open()"), v();
								break;
							case "VersionError": if (0 < p) return p = 0, v();
						}
						return K.reject(e);
					});
				}
				var n, i = d.dbReadyResolve, m = null, b = !1;
				return K.race([t, ("undefined" == typeof navigator ? K.resolve() : !navigator.userAgentData && /Safari\//.test(navigator.userAgent) && !/Chrom(e|ium)\//.test(navigator.userAgent) && indexedDB.databases ? new Promise(function(e) {
					function t() {
						return indexedDB.databases().finally(e);
					}
					n = setInterval(t, 100), t();
				}).finally(function() {
					return clearInterval(n);
				}) : Promise.resolve()).then(v)]).then(function() {
					return e(), d.onReadyBeingFired = [], K.resolve(xn(function() {
						return h.on.ready.fire(h.vip);
					})).then(function e() {
						var t;
						if (0 < d.onReadyBeingFired.length) return t = d.onReadyBeingFired.reduce(ke, g), d.onReadyBeingFired = [], K.resolve(xn(function() {
							return t(h.vip);
						})).then(e);
					});
				}).finally(function() {
					d.openCanceller === t && (d.onReadyBeingFired = null, d.isBeingOpened = !1);
				}).catch(function(e) {
					d.dbOpenError = e;
					try {
						m && m.abort();
					} catch (e) {}
					return t === d.openCanceller && h._close(), S(e);
				}).finally(function() {
					d.openComplete = !0, i();
				}).then(function() {
					var n;
					return b && (n = {}, h.tables.forEach(function(t) {
						t.schema.indexes.forEach(function(e) {
							e.name && (n["idb://".concat(h.name, "/").concat(t.name, "/").concat(e.name)] = new q(-1 / 0, [[[]]]));
						}), n["idb://".concat(h.name, "/").concat(t.name, "/")] = n["idb://".concat(h.name, "/").concat(t.name, "/:dels")] = new q(-1 / 0, [[[]]]);
					}), Wt(zt).fire(n), Bn(n, !0)), h;
				});
			}
			function Nn(t) {
				function e(e) {
					return t.next(e);
				}
				var r = n(e), i = n(function(e) {
					return t.throw(e);
				});
				function n(n) {
					return function(e) {
						var e = n(e), t = e.value;
						return e.done ? t : t && "function" == typeof t.then ? t.then(r, i) : x(t) ? Promise.all(t).then(r, i) : r(t);
					};
				}
				return n(e)();
			}
			function Mn(e, t, n) {
				for (var r = x(e) ? e.slice() : [e], i = 0; i < n; ++i) r.push(t);
				return r;
			}
			var Ln = {
				stack: "dbcore",
				name: "VirtualIndexMiddleware",
				level: 1,
				create: function(l) {
					return _(_({}, l), { table: function(e) {
						var o = l.table(e), e = o.schema, u = Object.create(null), s = [];
						function c(e, t, n) {
							var r = en(e), i = u[r] = u[r] || [], o = null == e ? 0 : "string" == typeof e ? 1 : e.length, a = 0 < t, r = _(_({}, n), {
								name: a ? "".concat(r, "(virtual-from:").concat(n.name, ")") : n.name,
								lowLevelIndex: n,
								isVirtual: a,
								keyTail: t,
								keyLength: o,
								extractKey: Ht(e),
								unique: !a && n.unique
							});
							return i.push(r), r.isPrimaryKey || s.push(r), 1 < o && c(2 === o ? e[0] : e.slice(0, o - 1), t + 1, n), i.sort(function(e, t) {
								return e.keyTail - t.keyTail;
							}), r;
						}
						var t = c(e.primaryKey.keyPath, 0, e.primaryKey);
						u[":id"] = [t];
						for (var n = 0, r = e.indexes; n < r.length; n++) {
							var i = r[n];
							c(i.keyPath, 0, i);
						}
						function a(e) {
							var t, n = e.query.index;
							return n.isVirtual ? _(_({}, e), { query: {
								index: n.lowLevelIndex,
								range: (t = e.query.range, n = n.keyTail, {
									type: 1 === t.type ? 2 : t.type,
									lower: Mn(t.lower, t.lowerOpen ? l.MAX_KEY : l.MIN_KEY, n),
									lowerOpen: !0,
									upper: Mn(t.upper, t.upperOpen ? l.MIN_KEY : l.MAX_KEY, n),
									upperOpen: !0
								})
							} }) : e;
						}
						return _(_({}, o), {
							schema: _(_({}, e), {
								primaryKey: t,
								indexes: s,
								getIndexByKeyPath: function(e) {
									return (e = u[en(e)]) && e[0];
								}
							}),
							count: function(e) {
								return o.count(a(e));
							},
							query: function(e) {
								return o.query(a(e));
							},
							openCursor: function(t) {
								var e = t.query.index, r = e.keyTail, i = e.keyLength;
								return e.isVirtual ? o.openCursor(a(t)).then(function(e) {
									return e && n(e);
								}) : o.openCursor(t);
								function n(n) {
									return Object.create(n, {
										continue: { value: function(e) {
											null != e ? n.continue(Mn(e, t.reverse ? l.MAX_KEY : l.MIN_KEY, r)) : t.unique ? n.continue(n.key.slice(0, i).concat(t.reverse ? l.MIN_KEY : l.MAX_KEY, r)) : n.continue();
										} },
										continuePrimaryKey: { value: function(e, t) {
											n.continuePrimaryKey(Mn(e, l.MAX_KEY, r), t);
										} },
										primaryKey: { get: function() {
											return n.primaryKey;
										} },
										key: { get: function() {
											var e = n.key;
											return 1 === i ? e[0] : e.slice(0, i);
										} },
										value: { get: function() {
											return n.value;
										} }
									});
								}
							}
						});
					} });
				}
			};
			function Un(i, o, a, u) {
				return a = a || {}, u = u || "", O(i).forEach(function(e) {
					var t, n, r;
					m(o, e) ? (t = i[e], n = o[e], "object" == typeof t && "object" == typeof n && t && n ? (r = ne(t)) !== ne(n) ? a[u + e] = o[e] : "Object" === r ? Un(t, n, a, u + e + ".") : t !== n && (a[u + e] = o[e]) : t !== n && (a[u + e] = o[e])) : a[u + e] = void 0;
				}), O(o).forEach(function(e) {
					m(i, e) || (a[u + e] = o[e]);
				}), a;
			}
			function zn(e, t) {
				return "delete" === t.type ? t.keys : t.keys || t.values.map(e.extractKey);
			}
			var Vn = {
				stack: "dbcore",
				name: "HooksMiddleware",
				level: 2,
				create: function(e) {
					return _(_({}, e), { table: function(r) {
						var y = e.table(r), v = y.schema.primaryKey;
						return _(_({}, y), { mutate: function(e) {
							var t = P.trans, n = t.table(r).hook, h = n.deleting, d = n.creating, p = n.updating;
							switch (e.type) {
								case "add":
									if (d.fire === g) break;
									return t._promise("readwrite", function() {
										return a(e);
									}, !0);
								case "put":
									if (d.fire === g && p.fire === g) break;
									return t._promise("readwrite", function() {
										return a(e);
									}, !0);
								case "delete":
									if (h.fire === g) break;
									return t._promise("readwrite", function() {
										return a(e);
									}, !0);
								case "deleteRange":
									if (h.fire === g) break;
									return t._promise("readwrite", function() {
										return function n(r, i, o) {
											return y.query({
												trans: r,
												values: !1,
												query: {
													index: v,
													range: i
												},
												limit: o
											}).then(function(e) {
												var t = e.result;
												return a({
													type: "delete",
													keys: t,
													trans: r
												}).then(function(e) {
													return 0 < e.numFailures ? Promise.reject(e.failures[0]) : t.length < o ? {
														failures: [],
														numFailures: 0,
														lastResult: void 0
													} : n(r, _(_({}, i), {
														lower: t[t.length - 1],
														lowerOpen: !0
													}), o);
												});
											});
										}(e.trans, e.range, 1e4);
									}, !0);
							}
							return y.mutate(e);
							function a(c) {
								var e, t, n, l = P.trans, f = c.keys || zn(v, c);
								if (f) return "delete" !== (c = "add" === c.type || "put" === c.type ? _(_({}, c), { keys: f }) : _({}, c)).type && (c.values = R([], c.values, !0)), c.keys && (c.keys = R([], c.keys, !0)), e = y, n = f, ("add" === (t = c).type ? Promise.resolve([]) : e.getMany({
									trans: t.trans,
									keys: n,
									cache: "immutable"
								})).then(function(u) {
									var s = f.map(function(e, t) {
										var n, r, i, o = u[t], a = {
											onerror: null,
											onsuccess: null
										};
										return "delete" === c.type ? h.fire.call(a, e, o, l) : "add" === c.type || void 0 === o ? (n = d.fire.call(a, e, c.values[t], l), null == e && null != n && (c.keys[t] = e = n, v.outbound || b(c.values[t], v.keyPath, e))) : (n = Un(o, c.values[t]), (r = p.fire.call(a, n, e, o, l)) && (i = c.values[t], Object.keys(r).forEach(function(e) {
											m(i, e) ? i[e] = r[e] : b(i, e, r[e]);
										}))), a;
									});
									return y.mutate(c).then(function(e) {
										for (var t = e.failures, n = e.results, r = e.numFailures, e = e.lastResult, i = 0; i < f.length; ++i) {
											var o = (n || f)[i], a = s[i];
											null == o ? a.onerror && a.onerror(t[i]) : a.onsuccess && a.onsuccess("put" === c.type && u[i] ? c.values[i] : o);
										}
										return {
											failures: t,
											results: n,
											numFailures: r,
											lastResult: e
										};
									}).catch(function(t) {
										return s.forEach(function(e) {
											return e.onerror && e.onerror(t);
										}), Promise.reject(t);
									});
								});
								throw new Error("Keys missing");
							}
						} });
					} });
				}
			};
			function Wn(e, t, n) {
				try {
					if (!t) return null;
					if (t.keys.length < e.length) return null;
					for (var r = [], i = 0, o = 0; i < t.keys.length && o < e.length; ++i) 0 === j(t.keys[i], e[o]) && (r.push(n ? ee(t.values[i]) : t.values[i]), ++o);
					return r.length === e.length ? r : null;
				} catch (e) {
					return null;
				}
			}
			var Yn = {
				stack: "dbcore",
				level: -1,
				create: function(t) {
					return { table: function(e) {
						var n = t.table(e);
						return _(_({}, n), {
							getMany: function(t) {
								var e;
								return t.cache ? (e = Wn(t.keys, t.trans._cache, "clone" === t.cache)) ? K.resolve(e) : n.getMany(t).then(function(e) {
									return t.trans._cache = {
										keys: t.keys,
										values: "clone" === t.cache ? ee(e) : e
									}, e;
								}) : n.getMany(t);
							},
							mutate: function(e) {
								return "add" !== e.type && (e.trans._cache = null), n.mutate(e);
							}
						});
					} };
				}
			};
			function $n(e, t) {
				return "readonly" === e.trans.mode && !!e.subscr && !e.trans.explicit && "disabled" !== e.trans.db._options.cache && !t.schema.primaryKey.outbound;
			}
			function Qn(e, t) {
				switch (e) {
					case "query": return t.values && !t.unique;
					case "get":
					case "getMany":
					case "count":
					case "openCursor": return !1;
				}
			}
			var Gn = {
				stack: "dbcore",
				level: 0,
				name: "Observability",
				create: function(b) {
					var g = b.schema.name, w = new q(b.MIN_KEY, b.MAX_KEY);
					return _(_({}, b), {
						transaction: function(e, t, n) {
							if (P.subscr && "readonly" !== t) throw new k.ReadOnly("Readwrite transaction in liveQuery context. Querier source: ".concat(P.querier));
							return b.transaction(e, t, n);
						},
						table: function(d) {
							function e(e) {
								var t, e = e.query;
								return [t = e.index, new q(null != (t = (e = e.range).lower) ? t : b.MIN_KEY, null != (t = e.upper) ? t : b.MAX_KEY)];
							}
							var p = b.table(d), y = p.schema, v = y.primaryKey, t = y.indexes, c = v.extractKey, l = v.outbound, m = v.autoIncrement && t.filter(function(e) {
								return e.compound && e.keyPath.includes(v.keyPath);
							}), n = _(_({}, p), { mutate: function(a) {
								function u(e) {
									return e = "idb://".concat(g, "/").concat(d, "/").concat(e), n[e] || (n[e] = new q());
								}
								var e, o, s, t = a.trans, n = a.mutatedParts || (a.mutatedParts = {}), r = u(""), i = u(":dels"), c = a.type, l = "deleteRange" === a.type ? [a.range] : "delete" === a.type ? [a.keys] : a.values.length < 50 ? [zn(v, a).filter(function(e) {
									return e;
								}), a.values] : [], f = l[0], l = l[1], h = a.trans._cache;
								return x(f) ? (r.addKeys(f), (c = "delete" === c || f.length === l.length ? Wn(f, h) : null) || i.addKeys(f), (c || l) && (e = u, o = c, s = l, y.indexes.forEach(function(t) {
									var n = e(t.name || "");
									function r(e) {
										return null != e ? t.extractKey(e) : null;
									}
									function i(e) {
										t.multiEntry && x(e) ? e.forEach(function(e) {
											return n.addKey(e);
										}) : n.addKey(e);
									}
									(o || s).forEach(function(e, t) {
										var n = o && r(o[t]), t = s && r(s[t]);
										0 !== j(n, t) && (null != n && i(n), null != t) && i(t);
									});
								}))) : f ? (l = {
									from: null != (h = f.lower) ? h : b.MIN_KEY,
									to: null != (c = f.upper) ? c : b.MAX_KEY
								}, i.add(l), r.add(l)) : (r.add(w), i.add(w), y.indexes.forEach(function(e) {
									return u(e.name).add(w);
								})), p.mutate(a).then(function(o) {
									return !f || "add" !== a.type && "put" !== a.type || (r.addKeys(o.results), m && m.forEach(function(t) {
										for (var e = a.values.map(function(e) {
											return t.extractKey(e);
										}), n = t.keyPath.findIndex(function(e) {
											return e === v.keyPath;
										}), r = 0, i = o.results.length; r < i; ++r) e[r][n] = o.results[r];
										u(t.name).addKeys(e);
									})), t.mutatedParts = jn(t.mutatedParts || {}, n), o;
								});
							} }), f = {
								get: function(e) {
									return [v, new q(e.key)];
								},
								getMany: function(e) {
									return [v, new q().addKeys(e.keys)];
								},
								count: e,
								query: e,
								openCursor: e
							};
							return O(f).forEach(function(s) {
								n[s] = function(i) {
									var e = P.subscr, t = !!e, n = $n(P, p) && Qn(s, i) ? i.obsSet = {} : e;
									if (t) {
										var o, e = function(e) {
											e = "idb://".concat(g, "/").concat(d, "/").concat(e);
											return n[e] || (n[e] = new q());
										}, a = e(""), u = e(":dels"), t = f[s](i), r = t[0], t = t[1];
										if (("query" === s && r.isPrimaryKey && !i.values ? u : e(r.name || "")).add(t), !r.isPrimaryKey) {
											if ("count" !== s) return o = "query" === s && l && i.values && p.query(_(_({}, i), { values: !1 })), p[s].apply(this, arguments).then(function(t) {
												if ("query" === s) {
													if (l && i.values) return o.then(function(e) {
														e = e.result;
														return a.addKeys(e), t;
													});
													var e = i.values ? t.result.map(c) : t.result;
													(i.values ? a : u).addKeys(e);
												} else {
													var n, r;
													if ("openCursor" === s) return r = i.values, (n = t) && Object.create(n, {
														key: { get: function() {
															return u.addKey(n.primaryKey), n.key;
														} },
														primaryKey: { get: function() {
															var e = n.primaryKey;
															return u.addKey(e), e;
														} },
														value: { get: function() {
															return r && a.addKey(n.primaryKey), n.value;
														} }
													});
												}
												return t;
											});
											u.add(w);
										}
									}
									return p[s].apply(this, arguments);
								};
							}), n;
						}
					});
				}
			};
			function Xn(e, t, n) {
				var r;
				return 0 === n.numFailures ? t : "deleteRange" === t.type || (r = t.keys ? t.keys.length : "values" in t && t.values ? t.values.length : 1, n.numFailures === r) ? null : (r = _({}, t), x(r.keys) && (r.keys = r.keys.filter(function(e, t) {
					return !(t in n.failures);
				})), "values" in r && x(r.values) && (r.values = r.values.filter(function(e, t) {
					return !(t in n.failures);
				})), r);
			}
			function Hn(e, t) {
				return n = e, (void 0 === (r = t).lower || (r.lowerOpen ? 0 < j(n, r.lower) : 0 <= j(n, r.lower))) && (n = e, void 0 === (r = t).upper || (r.upperOpen ? j(n, r.upper) < 0 : j(n, r.upper) <= 0));
				var n, r;
			}
			function Jn(e, d, t, n, r, i) {
				var o, p, y, v, m, a, u;
				return !t || 0 === t.length || (o = d.query.index, p = o.multiEntry, y = d.query.range, v = n.schema.primaryKey.extractKey, m = o.extractKey, a = (o.lowLevelIndex || o).extractKey, (n = t.reduce(function(e, t) {
					var n = e, r = [];
					if ("add" === t.type || "put" === t.type) for (var i = new q(), o = t.values.length - 1; 0 <= o; --o) {
						var a, u = t.values[o], s = v(u);
						!i.hasKey(s) && (a = m(u), p && x(a) ? a.some(function(e) {
							return Hn(e, y);
						}) : Hn(a, y)) && (i.addKey(s), r.push(u));
					}
					switch (t.type) {
						case "add":
							var c = new q().addKeys(d.values ? e.map(function(e) {
								return v(e);
							}) : e), n = e.concat(d.values ? r.filter(function(e) {
								e = v(e);
								return !c.hasKey(e) && (c.addKey(e), !0);
							}) : r.map(function(e) {
								return v(e);
							}).filter(function(e) {
								return !c.hasKey(e) && (c.addKey(e), !0);
							}));
							break;
						case "put":
							var l = new q().addKeys(t.values.map(function(e) {
								return v(e);
							}));
							n = e.filter(function(e) {
								return !l.hasKey(d.values ? v(e) : e);
							}).concat(d.values ? r : r.map(function(e) {
								return v(e);
							}));
							break;
						case "delete":
							var f = new q().addKeys(t.keys);
							n = e.filter(function(e) {
								return !f.hasKey(d.values ? v(e) : e);
							});
							break;
						case "deleteRange":
							var h = t.range;
							n = e.filter(function(e) {
								return !Hn(v(e), h);
							});
					}
					return n;
				}, e)) === e) ? e : (u = function(e, t) {
					return j(a(e), a(t)) || j(v(e), v(t));
				}, n.sort("prev" === d.direction || "prevunique" === d.direction ? function(e, t) {
					return u(t, e);
				} : u), d.limit && d.limit < 1 / 0 && (n.length > d.limit ? n.length = d.limit : e.length === d.limit && n.length < d.limit && (r.dirty = !0)), i ? Object.freeze(n) : n);
			}
			function Zn(e, t) {
				return 0 === j(e.lower, t.lower) && 0 === j(e.upper, t.upper) && !!e.lowerOpen == !!t.lowerOpen && !!e.upperOpen == !!t.upperOpen;
			}
			function er(e, t) {
				return ((e, t, n, r) => {
					if (void 0 === e) return void 0 !== t ? -1 : 0;
					if (void 0 === t) return 1;
					if (0 === (e = j(e, t))) {
						if (n && r) return 0;
						if (n) return 1;
						if (r) return -1;
					}
					return e;
				})(e.lower, t.lower, e.lowerOpen, t.lowerOpen) <= 0 && 0 <= ((e, t, n, r) => {
					if (void 0 === e) return void 0 !== t ? 1 : 0;
					if (void 0 === t) return -1;
					if (0 === (e = j(e, t))) {
						if (n && r) return 0;
						if (n) return -1;
						if (r) return 1;
					}
					return e;
				})(e.upper, t.upper, e.upperOpen, t.upperOpen);
			}
			function tr(n, r, i, e) {
				n.subscribers.add(i), e.addEventListener("abort", function() {
					var e, t;
					n.subscribers.delete(i), 0 === n.subscribers.size && (e = n, t = r, setTimeout(function() {
						0 === e.subscribers.size && oe(t, e);
					}, 3e3));
				});
			}
			var nr = {
				stack: "dbcore",
				level: 0,
				name: "Cache",
				create: function(k) {
					var O = k.schema.name;
					return _(_({}, k), {
						transaction: function(g, w, e) {
							var _, t, x = k.transaction(g, w, e);
							return "readwrite" === w && (e = (_ = new AbortController()).signal, x.addEventListener("abort", (t = function(b) {
								return function() {
									if (_.abort(), "readwrite" === w) {
										for (var t = /* @__PURE__ */ new Set(), e = 0, n = g; e < n.length; e++) {
											var r = n[e], i = Tn["idb://".concat(O, "/").concat(r)];
											if (i) {
												var o = k.table(r), a = i.optimisticOps.filter(function(e) {
													return e.trans === x;
												});
												if (x._explicit && b && x.mutatedParts) for (var u = 0, s = Object.values(i.queries.query); u < s.length; u++) for (var c = 0, l = (d = s[u]).slice(); c < l.length; c++) Cn((p = l[c]).obsSet, x.mutatedParts) && (oe(d, p), p.subscribers.forEach(function(e) {
													return t.add(e);
												}));
												else if (0 < a.length) {
													i.optimisticOps = i.optimisticOps.filter(function(e) {
														return e.trans !== x;
													});
													for (var f = 0, h = Object.values(i.queries.query); f < h.length; f++) for (var d, p, y, v = 0, m = (d = h[f]).slice(); v < m.length; v++) null != (p = m[v]).res && x.mutatedParts && (b && !p.dirty ? (y = Object.isFrozen(p.res), y = Jn(p.res, p.req, a, o, p, y), p.dirty ? (oe(d, p), p.subscribers.forEach(function(e) {
														return t.add(e);
													})) : y !== p.res && (p.res = y, p.promise = K.resolve({ result: y }))) : (p.dirty && oe(d, p), p.subscribers.forEach(function(e) {
														return t.add(e);
													})));
												}
											}
										}
										t.forEach(function(e) {
											return e();
										});
									}
								};
							})(!1), { signal: e }), x.addEventListener("error", t(!1), { signal: e }), x.addEventListener("complete", t(!0), { signal: e })), x;
						},
						table: function(s) {
							var c = k.table(s), i = c.schema.primaryKey;
							return _(_({}, c), {
								mutate: function(t) {
									var n, e = P.trans;
									return !i.outbound && "disabled" !== e.db._options.cache && !e.explicit && "readwrite" === e.idbtrans.mode && (n = Tn["idb://".concat(O, "/").concat(s)]) ? (e = c.mutate(t), "add" !== t.type && "put" !== t.type || !(50 <= t.values.length || zn(i, t).some(function(e) {
										return null == e;
									})) ? (n.optimisticOps.push(t), t.mutatedParts && Dn(t.mutatedParts), e.then(function(e) {
										0 < e.numFailures && (oe(n.optimisticOps, t), (e = Xn(0, t, e)) && n.optimisticOps.push(e), t.mutatedParts) && Dn(t.mutatedParts);
									}), e.catch(function() {
										oe(n.optimisticOps, t), t.mutatedParts && Dn(t.mutatedParts);
									})) : e.then(function(r) {
										var e = Xn(0, _(_({}, t), { values: t.values.map(function(e, t) {
											var n;
											return r.failures[t] ? e : (b(n = null != (n = i.keyPath) && n.includes(".") ? ee(e) : _({}, e), i.keyPath, r.results[t]), n);
										}) }), r);
										n.optimisticOps.push(e), queueMicrotask(function() {
											return t.mutatedParts && Dn(t.mutatedParts);
										});
									}), e) : c.mutate(t);
								},
								query: function(t) {
									var i, e, n, r, o, a, u;
									return $n(P, c) && Qn("query", t) ? (i = "immutable" === (null == (n = P.trans) ? void 0 : n.db._options.cache), e = (n = P).requery, n = n.signal, a = ((e, t, n, r) => {
										var i = Tn["idb://".concat(e, "/").concat(t)];
										if (!i) return [];
										if (!(e = i.queries[n])) return [
											null,
											!1,
											i,
											null
										];
										var o = e[(r.query ? r.query.index.name : null) || ""];
										if (!o) return [
											null,
											!1,
											i,
											null
										];
										switch (n) {
											case "query":
												var a = null != (u = r.direction) ? u : "next", u = o.find(function(e) {
													var t;
													return e.req.limit === r.limit && e.req.values === r.values && (null != (t = e.req.direction) ? t : "next") === a && Zn(e.req.query.range, r.query.range);
												});
												return u ? [
													u,
													!0,
													i,
													o
												] : [
													o.find(function(e) {
														var t;
														return ("limit" in e.req ? e.req.limit : 1 / 0) >= r.limit && (null != (t = e.req.direction) ? t : "next") === a && (!r.values || e.req.values) && er(e.req.query.range, r.query.range);
													}),
													!1,
													i,
													o
												];
											case "count":
												u = o.find(function(e) {
													return Zn(e.req.query.range, r.query.range);
												});
												return [
													u,
													!!u,
													i,
													o
												];
										}
									})(O, s, "query", t), u = a[0], r = a[2], o = a[3], u && a[1] ? u.obsSet = t.obsSet : (a = c.query(t).then(function(e) {
										var t = e.result;
										if (u && (u.res = t), i) {
											for (var n = 0, r = t.length; n < r; ++n) Object.freeze(t[n]);
											Object.freeze(t);
										}
										return e;
									}).catch(function(e) {
										return o && u && oe(o, u), Promise.reject(e);
									}), u = {
										obsSet: t.obsSet,
										promise: a,
										subscribers: /* @__PURE__ */ new Set(),
										type: "query",
										req: t,
										dirty: !1
									}, o ? o.push(u) : (o = [u], (r = r || (Tn["idb://".concat(O, "/").concat(s)] = {
										queries: {
											query: {},
											count: {}
										},
										objs: /* @__PURE__ */ new Map(),
										optimisticOps: [],
										unsignaledParts: {}
									})).queries.query[t.query.index.name || ""] = o)), tr(u, o, e, n), u.promise.then(function(e) {
										e = Jn(e.result, t, null == r ? void 0 : r.optimisticOps, c, u, i);
										return { result: i ? e : ee(e) };
									})) : c.query(t);
								}
							});
						}
					});
				}
			};
			function rr(e, r) {
				return new Proxy(e, { get: function(e, t, n) {
					return "db" === t ? r : Reflect.get(e, t, n);
				} });
			}
			D.prototype.version = function(t) {
				if (isNaN(t) || t < .1) throw new k.Type("Given version is not a positive number");
				if (t = Math.round(10 * t) / 10, this.idbdb || this._state.isBeingOpened) throw new k.Schema("Cannot add version when database is open");
				this.verno = Math.max(this.verno, t);
				var e = this._versions, n = e.filter(function(e) {
					return e._cfg.version === t;
				})[0];
				return n || (n = new this.Version(t), e.push(n), e.sort(un), n.stores({}), this._state.autoSchema = !1), n;
			}, D.prototype._whenReady = function(e) {
				var n = this;
				return this.idbdb && (this._state.openComplete || P.letThrough || this._vip) ? e() : new K(function(e, t) {
					if (n._state.openComplete) return t(new k.DatabaseClosed(n._state.dbOpenError));
					if (!n._state.isBeingOpened) {
						if (!n._state.autoOpen) return void t(new k.DatabaseClosed());
						n.open().catch(g);
					}
					n._state.dbReadyPromise.then(e, t);
				}).then(e);
			}, D.prototype.use = function(e) {
				var t = e.stack, n = e.create, r = e.level, e = e.name, i = (e && this.unuse({
					stack: t,
					name: e
				}), this._middlewares[t] || (this._middlewares[t] = []));
				return i.push({
					stack: t,
					create: n,
					level: null == r ? 10 : r,
					name: e
				}), i.sort(function(e, t) {
					return e.level - t.level;
				}), this;
			}, D.prototype.unuse = function(e) {
				var t = e.stack, n = e.name, r = e.create;
				return t && this._middlewares[t] && (this._middlewares[t] = this._middlewares[t].filter(function(e) {
					return r ? e.create !== r : !!n && e.name !== n;
				})), this;
			}, D.prototype.open = function() {
				var e = this;
				return at(s, function() {
					return Fn(e);
				});
			}, D.prototype._close = function() {
				this.on.close.fire(new CustomEvent("close"));
				var n = this._state;
				if (gn.remove(this), this.idbdb) {
					try {
						this.idbdb.close();
					} catch (e) {}
					this.idbdb = null;
				}
				n.isBeingOpened || (n.dbReadyPromise = new K(function(e) {
					n.dbReadyResolve = e;
				}), n.openCanceller = new K(function(e, t) {
					n.cancelOpen = t;
				}));
			}, D.prototype.close = function(e) {
				var e = (void 0 === e ? { disableAutoOpen: !0 } : e).disableAutoOpen, t = this._state;
				e ? (t.isBeingOpened && t.cancelOpen(new k.DatabaseClosed()), this._close(), t.autoOpen = !1, t.dbOpenError = new k.DatabaseClosed()) : (this._close(), t.autoOpen = this._options.autoOpen || t.isBeingOpened, t.openComplete = !1, t.dbOpenError = null);
			}, D.prototype.delete = function(n) {
				var i = this, o = (void 0 === n && (n = { disableAutoOpen: !0 }), 0 < arguments.length && "object" != typeof arguments[0]), a = this._state;
				return new K(function(r, t) {
					function e() {
						i.close(n);
						var e = i._deps.indexedDB.deleteDatabase(i.name);
						e.onsuccess = E(function() {
							var e = i._deps, t = i.name, n;
							_n(n = e.indexedDB) || t === ft || wn(n, e.IDBKeyRange).delete(t).catch(g), r();
						}), e.onerror = I(t), e.onblocked = i._fireOnBlocked;
					}
					if (o) throw new k.InvalidArgument("Invalid closeOptions argument to db.delete()");
					a.isBeingOpened ? a.dbReadyPromise.then(e) : e();
				});
			}, D.prototype.backendDB = function() {
				return this.idbdb;
			}, D.prototype.isOpen = function() {
				return null !== this.idbdb;
			}, D.prototype.hasBeenClosed = function() {
				var e = this._state.dbOpenError;
				return e && "DatabaseClosed" === e.name;
			}, D.prototype.hasFailed = function() {
				return null !== this._state.dbOpenError;
			}, D.prototype.dynamicallyOpened = function() {
				return this._state.autoSchema;
			}, Object.defineProperty(D.prototype, "tables", {
				get: function() {
					var t = this;
					return O(this._allTables).map(function(e) {
						return t._allTables[e];
					});
				},
				enumerable: !1,
				configurable: !0
			}), D.prototype.transaction = function() {
				var e = function(e, t, n) {
					var r = arguments.length;
					if (r < 2) throw new k.InvalidArgument("Too few arguments");
					for (var i = new Array(r - 1); --r;) i[r - 1] = arguments[r];
					return n = i.pop(), [
						e,
						H(i),
						n
					];
				}.apply(this, arguments);
				return this._transaction.apply(this, e);
			}, D.prototype._transaction = function(e, t, n) {
				var r, i, o = this, a = P.trans, u = (a && a.db === this && -1 === e.indexOf("!") || (a = null), -1 !== e.indexOf("?"));
				e = e.replace("!", "").replace("?", "");
				try {
					if (i = t.map(function(e) {
						e = e instanceof o.Table ? e.name : e;
						if ("string" != typeof e) throw new TypeError("Invalid table argument to Dexie.transaction(). Only Table or String are allowed");
						return e;
					}), "r" == e || e === ht) r = ht;
					else {
						if ("rw" != e && e != dt) throw new k.InvalidArgument("Invalid transaction mode: " + e);
						r = dt;
					}
					if (a) {
						if (a.mode === ht && r === dt) {
							if (!u) throw new k.SubTransaction("Cannot enter a sub-transaction with READWRITE mode when parent transaction is READONLY");
							a = null;
						}
						a && i.forEach(function(e) {
							if (a && -1 === a.storeNames.indexOf(e)) {
								if (!u) throw new k.SubTransaction("Table " + e + " not included in parent transaction.");
								a = null;
							}
						}), u && a && !a.active && (a = null);
					}
				} catch (n) {
					return a ? a._promise(null, function(e, t) {
						t(n);
					}) : S(n);
				}
				var s = function i(o, a, u, s, c) {
					return K.resolve().then(function() {
						var e = P.transless || P, t = o._createTransaction(a, u, o._dbSchema, s), e = (t.explicit = !0, {
							trans: t,
							transless: e
						});
						if (s) t.idbtrans = s.idbtrans;
						else try {
							t.create(), t.idbtrans._explicit = !0, o._state.PR1398_maxLoop = 3;
						} catch (e) {
							return e.name === de.InvalidState && o.isOpen() && 0 < --o._state.PR1398_maxLoop ? (console.warn("Dexie: Need to reopen db"), o.close({ disableAutoOpen: !1 }), o.open().then(function() {
								return i(o, a, u, null, c);
							})) : S(e);
						}
						var n, r = ue(c), e = (r && nt(), K.follow(function() {
							var e;
							(n = c.call(t, t)) && (r ? (e = w.bind(null, null), n.then(e, e)) : "function" == typeof n.next && "function" == typeof n.throw && (n = Nn(n)));
						}, e));
						return (n && "function" == typeof n.then ? K.resolve(n).then(function(e) {
							return t.active ? e : S(new k.PrematureCommit("Transaction committed too early. See http://bit.ly/2kdckMn"));
						}) : e.then(function() {
							return n;
						})).then(function(e) {
							return s && t._resolve(), t._completion.then(function() {
								return e;
							});
						}).catch(function(e) {
							return t._reject(e), S(e);
						});
					});
				}.bind(null, this, r, i, a, n);
				return a ? a._promise(r, s, "lock") : P.trans ? at(P.transless, function() {
					return o._whenReady(s);
				}) : this._whenReady(s);
			}, D.prototype.table = function(e) {
				if (m(this._allTables, e)) return this._allTables[e];
				throw new k.InvalidTable("Table ".concat(e, " does not exist"));
			};
			var y = D;
			function D(e, t) {
				var o, r, a, n, i, u = this, s = (this._middlewares = {}, this.verno = 0, D.dependencies), s = (this._options = t = _({
					addons: D.addons,
					autoOpen: !0,
					indexedDB: s.indexedDB,
					IDBKeyRange: s.IDBKeyRange,
					cache: "cloned",
					maxConnections: 1e3
				}, t), this._deps = {
					indexedDB: t.indexedDB,
					IDBKeyRange: t.IDBKeyRange
				}, t.addons), c = (this._dbSchema = {}, this._versions = [], this._storeNames = [], this._allTables = {}, this.idbdb = null, this._novip = this, {
					dbOpenError: null,
					isBeingOpened: !1,
					onReadyBeingFired: null,
					openComplete: !1,
					dbReadyResolve: g,
					dbReadyPromise: null,
					cancelOpen: g,
					openCanceller: null,
					autoSchema: !0,
					PR1398_maxLoop: 3,
					autoOpen: t.autoOpen
				}), l = (c.dbReadyPromise = new K(function(e) {
					c.dbReadyResolve = e;
				}), c.openCanceller = new K(function(e, t) {
					c.cancelOpen = t;
				}), this._state = c, this.name = e, this.on = Pt(this, "populate", "blocked", "versionchange", "close", { ready: [ke, g] }), this.once = function(n, r) {
					var i = function() {
						for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
						u.on(n).unsubscribe(i), r.apply(u, e);
					};
					return u.on(n, i);
				}, this.on.ready.subscribe = Y(this.on.ready.subscribe, function(i) {
					return function(n, r) {
						D.vip(function() {
							var t, e = u._state;
							e.openComplete ? (e.dbOpenError || K.resolve().then(n), r && i(n)) : e.onReadyBeingFired ? (e.onReadyBeingFired.push(n), r && i(n)) : (i(n), t = u, r || i(function e() {
								t.on.ready.unsubscribe(n), t.on.ready.unsubscribe(e);
							}));
						});
					};
				}), this.Collection = (o = this, Kt(qt.prototype, function(e, t) {
					this.db = o;
					var n = yt, r = null;
					if (t) try {
						n = t();
					} catch (e) {
						r = e;
					}
					var t = e._ctx, e = t.table, i = e.hook.reading.fire;
					this._ctx = {
						table: e,
						index: t.index,
						isPrimKey: !t.index || e.schema.primKey.keyPath && t.index === e.schema.primKey.name,
						range: n,
						keysOnly: !1,
						dir: "next",
						unique: "",
						algorithm: null,
						filter: null,
						replayFilter: null,
						justLimit: !0,
						isMatch: null,
						offset: 0,
						limit: 1 / 0,
						error: r,
						or: t.or,
						valueMapper: i !== ve ? i : null
					};
				})), this.Table = (r = this, Kt(Ot.prototype, function(e, t, n) {
					this.db = r, this._tx = n, this.name = e, this.schema = t, this.hook = r._allTables[e] ? r._allTables[e].hook : Pt(null, {
						creating: [ge, g],
						reading: [me, ve],
						updating: [_e, g],
						deleting: [we, g]
					});
				})), this.Transaction = (a = this, Kt(Yt.prototype, function(e, t, n, r, i) {
					var o = this;
					"readonly" !== e && t.forEach(function(e) {
						e = null == (e = n[e]) ? void 0 : e.yProps;
						e && (t = t.concat(e.map(function(e) {
							return e.updatesTable;
						})));
					}), this.db = a, this.mode = e, this.storeNames = t, this.schema = n, this.chromeTransactionDurability = r, this.idbtrans = null, this.on = Pt(this, "complete", "error", "abort"), this.parent = i || null, this.active = !0, this._reculock = 0, this._blockedFuncs = [], this._resolve = null, this._reject = null, this._waitingFor = null, this._waitingQueue = null, this._spinCount = 0, this._completion = new K(function(e, t) {
						o._resolve = e, o._reject = t;
					}), this._completion.then(function() {
						o.active = !1, o.on.complete.fire();
					}, function(e) {
						var t = o.active;
						return o.active = !1, o.on.error.fire(e), o.parent ? o.parent._reject(e) : t && o.idbtrans && o.idbtrans.abort(), S(e);
					});
				})), this.Version = (n = this, Kt(mn.prototype, function(e) {
					this.db = n, this._cfg = {
						version: e,
						storesSource: null,
						dbschema: {},
						tables: {},
						contentUpgrade: null
					};
				})), this.WhereClause = (i = this, Kt(Lt.prototype, function(e, t, n) {
					if (this.db = i, this._ctx = {
						table: e,
						index: ":id" === t ? null : t,
						or: n
					}, this._cmp = this._ascending = j, this._descending = function(e, t) {
						return j(t, e);
					}, this._max = function(e, t) {
						return 0 < j(e, t) ? e : t;
					}, this._min = function(e, t) {
						return j(e, t) < 0 ? e : t;
					}, this._IDBKeyRange = i._deps.IDBKeyRange, !this._IDBKeyRange) throw new k.MissingAPI();
				})), this.on("versionchange", function(e) {
					0 < e.newVersion ? console.warn("Another connection wants to upgrade database '".concat(u.name, "'. Closing db now to resume the upgrade.")) : console.warn("Another connection wants to delete database '".concat(u.name, "'. Closing db now to resume the delete request.")), u.close({ disableAutoOpen: !1 });
				}), this.on("blocked", function(e) {
					!e.newVersion || e.newVersion < e.oldVersion ? console.warn("Dexie.delete('".concat(u.name, "') was blocked")) : console.warn("Upgrade '".concat(u.name, "' blocked by other connection holding version ").concat(e.oldVersion / 10));
				}), this._maxKey = Xt(t.IDBKeyRange), this._createTransaction = function(e, t, n, r) {
					return new u.Transaction(e, t, n, u._options.chromeTransactionDurability, r);
				}, this._fireOnBlocked = function(t) {
					u.on("blocked").fire(t), gn.toArray().filter(function(e) {
						return e.name === u.name && e !== u && !e._state.vcFired;
					}).map(function(e) {
						return e.on("versionchange").fire(t);
					});
				}, this.use(Yn), this.use(nr), this.use(Gn), this.use(Ln), this.use(Vn), new Proxy(this, { get: function(e, t, n) {
					var r;
					return "_vip" === t || ("table" === t ? function(e) {
						return rr(u.table(e), l);
					} : (r = Reflect.get(e, t, n)) instanceof Ot ? rr(r, l) : "tables" === t ? r.map(function(e) {
						return rr(e, l);
					}) : "_createTransaction" === t ? function() {
						return rr(r.apply(this, arguments), l);
					} : r);
				} }));
				this.vip = l, s.forEach(function(e) {
					return e(u);
				});
			}
			var ir, Se = "undefined" != typeof Symbol && "observable" in Symbol ? Symbol.observable : "@@observable", or = (ar.prototype.subscribe = function(e, t, n) {
				return this._subscribe(e && "function" != typeof e ? e : {
					next: e,
					error: t,
					complete: n
				});
			}, ar.prototype[Se] = function() {
				return this;
			}, ar);
			function ar(e) {
				this._subscribe = e;
			}
			try {
				ir = {
					indexedDB: f.indexedDB || f.mozIndexedDB || f.webkitIndexedDB || f.msIndexedDB,
					IDBKeyRange: f.IDBKeyRange || f.webkitIDBKeyRange
				};
			} catch (e) {
				ir = {
					indexedDB: null,
					IDBKeyRange: null
				};
			}
			function ur(d) {
				var p, y = !1, e = new or(function(r) {
					var i = ue(d);
					var o, a = !1, u = {}, s = {}, e = {
						get closed() {
							return a;
						},
						unsubscribe: function() {
							a || (a = !0, o && o.abort(), c && Wt.storagemutated.unsubscribe(h));
						}
					}, c = (r.start && r.start(e), !1), l = function() {
						return st(t);
					};
					function f() {
						return Cn(s, u);
					}
					var h = function(e) {
						jn(u, e), f() && l();
					}, t = function() {
						var t, n, e;
						!a && ir.indexedDB && (u = {}, t = {}, o && o.abort(), o = new AbortController(), e = ((e) => {
							var t = $e();
							try {
								i && nt();
								var n = v(d, e);
								return n = i ? n.finally(w) : n;
							} finally {
								t && Qe();
							}
						})(n = {
							subscr: t,
							signal: o.signal,
							requery: l,
							querier: d,
							trans: null
						}), c || (Wt.storagemutated.subscribe(h), c = !0), Promise.resolve(e).then(function(e) {
							y = !0, p = e, a || n.signal.aborted || (f() || (s = t, f()) ? l() : (u = {}, st(function() {
								return !a && r.next && r.next(e);
							})));
						}, function(e) {
							y = !1, ["DatabaseClosedError", "AbortError"].includes(null == e ? void 0 : e.name) || a || st(function() {
								a || r.error && r.error(e);
							});
						}));
					};
					return setTimeout(l, 0), e;
				});
				return e.hasValue = function() {
					return y;
				}, e.getValue = function() {
					return p;
				}, e;
			}
			var sr = y;
			function cr(e) {
				var t = fr;
				try {
					fr = !0, Wt.storagemutated.fire(e), Bn(e, !0);
				} finally {
					fr = t;
				}
			}
			M(sr, _(_({}, e), {
				delete: function(e) {
					return new sr(e, { addons: [] }).delete();
				},
				exists: function(e) {
					return new sr(e, { addons: [] }).open().then(function(e) {
						return e.close(), !0;
					}).catch("NoSuchDatabaseError", function() {
						return !1;
					});
				},
				getDatabaseNames: function(e) {
					try {
						return t = sr.dependencies, n = t.indexedDB, t = t.IDBKeyRange, (_n(n) ? Promise.resolve(n.databases()).then(function(e) {
							return e.map(function(e) {
								return e.name;
							}).filter(function(e) {
								return e !== ft;
							});
						}) : wn(n, t).toCollection().primaryKeys()).then(e);
					} catch (e) {
						return S(new k.MissingAPI());
					}
					var t, n;
				},
				defineClass: function() {
					return function(e) {
						a(this, e);
					};
				},
				ignoreTransaction: function(e) {
					return P.trans ? at(P.transless || s, e) : e();
				},
				vip: xn,
				async: function(t) {
					return function() {
						try {
							var e = Nn(t.apply(this, arguments));
							return e && "function" == typeof e.then ? e : K.resolve(e);
						} catch (e) {
							return S(e);
						}
					};
				},
				spawn: function(e, t, n) {
					try {
						var r = Nn(e.apply(n, t || []));
						return r && "function" == typeof r.then ? r : K.resolve(r);
					} catch (e) {
						return S(e);
					}
				},
				currentTransaction: { get: function() {
					return P.trans || null;
				} },
				waitFor: function(e, t) {
					e = K.resolve("function" == typeof e ? sr.ignoreTransaction(e) : e).timeout(t || 6e4);
					return P.trans ? P.trans.waitFor(e) : e;
				},
				Promise: K,
				debug: {
					get: function() {
						return l;
					},
					set: function(e) {
						Oe(e);
					}
				},
				derive: U,
				extend: a,
				props: M,
				override: Y,
				Events: Pt,
				on: Wt,
				liveQuery: ur,
				extendObservabilitySet: jn,
				getByKeyPath: c,
				setByKeyPath: b,
				delByKeyPath: function(t, e) {
					"string" == typeof e ? b(t, e, void 0) : "length" in e && [].map.call(e, function(e) {
						b(t, e, void 0);
					});
				},
				shallowClone: G,
				deepClone: ee,
				getObjectDiff: Un,
				cmp: j,
				asap: Q,
				minKey: -1 / 0,
				addons: [],
				connections: { get: gn.toArray },
				errnames: de,
				dependencies: ir,
				cache: Tn,
				semVer: "4.4.6",
				version: "4.4.6".split(".").map(function(e) {
					return parseInt(e);
				}).reduce(function(e, t, n) {
					return e + t / Math.pow(10, 2 * n);
				})
			})), sr.maxKey = Xt(sr.dependencies.IDBKeyRange), "undefined" != typeof dispatchEvent && "undefined" != typeof addEventListener && (Wt(zt, function(e) {
				fr || (e = new CustomEvent(Vt, { detail: e }), fr = !0, dispatchEvent(e), fr = !1);
			}), addEventListener(Vt, function(e) {
				e = e.detail;
				fr || cr(e);
			}));
			var lr, fr = !1, hr = function() {};
			return "undefined" != typeof BroadcastChannel && ((hr = function() {
				(lr = new BroadcastChannel(Vt)).onmessage = function(e) {
					return e.data && cr(e.data);
				};
			})(), "function" == typeof lr.unref && lr.unref(), Wt(zt, function(e) {
				fr || lr.postMessage(e);
			})), "undefined" != typeof addEventListener && (addEventListener("pagehide", function(e) {
				if (!y.disableBfCache && e.persisted) {
					l && console.debug("Dexie: handling persisted pagehide"), lr?.close();
					for (var t = 0, n = gn.toArray(); t < n.length; t++) n[t].close({ disableAutoOpen: !1 });
				}
			}), addEventListener("pageshow", function(e) {
				!y.disableBfCache && e.persisted && (l && console.debug("Dexie: handling persisted pageshow"), hr(), cr({ all: new q(-1 / 0, [[]]) }));
			})), K.rejectionMapper = function(e, t) {
				return !e || e instanceof ce || e instanceof TypeError || e instanceof SyntaxError || !e.name || !ye[e.name] ? e : (t = new ye[e.name](t || e.message, e), "stack" in e && u(t, "stack", { get: function() {
					return this.inner.stack;
				} }), t);
			}, Oe(l), _(y, Object.freeze({
				__proto__: null,
				DEFAULT_MAX_CONNECTIONS: 1e3,
				Dexie: y,
				Entity: mt,
				PropModification: _t,
				RangeSet: q,
				add: function(e) {
					return new _t({ add: e });
				},
				cmp: j,
				default: y,
				liveQuery: ur,
				mergeRanges: Pn,
				rangesOverlap: Kn,
				remove: function(e) {
					return new _t({ remove: e });
				},
				replacePrefix: function(e, t) {
					return new _t({ replacePrefix: [e, t] });
				}
			}), { default: y }), y;
		});
	})))(), 1);
	var DexieSymbol = Symbol.for("Dexie");
	var Dexie = globalThis[DexieSymbol] || (globalThis[DexieSymbol] = import_dexie_min.default);
	if (import_dexie_min.default.semVer !== Dexie.semVer) throw new Error(`Two different versions of Dexie loaded in the same app: ${import_dexie_min.default.semVer} and ${Dexie.semVer}`);
	var { liveQuery, mergeRanges, rangesOverlap, RangeSet, cmp, Entity, PropModification, replacePrefix, add, remove, DexieYProvider } = Dexie;
	//#endregion
	//#region src/db/db.js
	/**
	* AI Toolbox — Hybrid Local Database
	* - Heavy chat logs live in IndexedDB (Dexie)
	* - Folders, Prompts, Settings & Counts sync via chrome.storage.local
	*   with fallback to Dexie to prevent data blocking.
	*/
	var db = new Dexie("AIToolbox");
	db.version(1).stores({
		chats: "&id, platform, folderId, isPinned, createdAt, updatedAt",
		folders: "&id, platform, order",
		prompts: "&id, usageCount, createdAt",
		settings: "&key"
	});
	var hasChromeStorage = () => typeof chrome !== "undefined" && !!chrome?.storage?.local;
	async function syncStatsToChromeStorage() {
		if (!hasChromeStorage()) return;
		try {
			const chats = await db.chats.toArray();
			if (!(window.location.hostname.includes("claude") ? "claude" : window.location.hostname.includes("chatgpt") ? "chatgpt" : null)) return;
			const metaMap = (await chrome.storage.local.get(["at_chats_meta"])).at_chats_meta || {};
			chats.forEach((c) => {
				metaMap[c.id] = {
					id: c.id,
					platform: c.platform,
					title: c.title,
					url: c.url,
					folderId: c.folderId || null,
					isPinned: Boolean(c.isPinned),
					updatedAt: c.updatedAt
				};
			});
			const allMeta = Object.values(metaMap);
			await chrome.storage.local.set({
				at_chats_meta: metaMap,
				stat_chats: allMeta.length
			});
		} catch (e) {
			console.warn("[AI Toolbox] Stat sync error:", e);
		}
	}
	async function upsertChat(chat) {
		if (!chat?.id) return;
		const existing = await db.chats.get(chat.id);
		if (existing) {
			const updates = {
				title: chat.title && chat.title !== "Untitled" ? chat.title : existing.title,
				url: chat.url || existing.url,
				updatedAt: chat.updatedAt || /* @__PURE__ */ new Date()
			};
			if (Array.isArray(chat.messages) && chat.messages.length > 0) updates.messages = chat.messages;
			await db.chats.update(chat.id, updates);
		} else await db.chats.add({
			id: chat.id,
			platform: chat.platform || "chatgpt",
			title: chat.title || "Untitled",
			url: chat.url || window.location.href,
			messages: Array.isArray(chat.messages) ? chat.messages : [],
			folderId: chat.folderId || null,
			isPinned: Boolean(chat.isPinned),
			createdAt: chat.createdAt || /* @__PURE__ */ new Date(),
			updatedAt: chat.updatedAt || /* @__PURE__ */ new Date()
		});
		await syncStatsToChromeStorage();
	}
	async function getAllChats(platform) {
		const localChats = await (platform ? db.chats.where("platform").equals(platform).toArray() : db.chats.toArray());
		if (localChats.length === 0 && hasChromeStorage()) {
			const stored = await chrome.storage.local.get(["at_chats_meta"]);
			const allMeta = Object.values(stored.at_chats_meta || {});
			return platform ? allMeta.filter((c) => c.platform === platform) : allMeta;
		}
		return localChats;
	}
	async function moveChatToFolder(chatId, folderId) {
		if (await db.chats.get(chatId)) await db.chats.update(chatId, {
			folderId,
			updatedAt: /* @__PURE__ */ new Date()
		});
		else {
			const platform = chatId.startsWith("claude_") ? "claude" : "chatgpt";
			const rawId = chatId.replace(/^(chatgpt_|claude_)/, "");
			await db.chats.add({
				id: chatId,
				platform,
				title: "Saved Chat",
				url: platform === "chatgpt" ? `https://chatgpt.com/c/${rawId}` : `https://claude.ai/chat/${rawId}`,
				messages: [],
				folderId,
				isPinned: false,
				createdAt: /* @__PURE__ */ new Date(),
				updatedAt: /* @__PURE__ */ new Date()
			});
		}
	}
	async function getFolders(platform) {
		let all = [];
		try {
			if (hasChromeStorage()) all = (await chrome.storage.local.get(["at_folders"])).at_folders || [];
		} catch (e) {}
		if (all.length === 0) all = await db.folders.orderBy("order").toArray();
		all.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
		if (platform && platform !== "all") return all.filter((f) => f.platform === platform || f.platform === "all");
		return all;
	}
	async function createFolder({ name, platform = "all" }) {
		const all = await getFolders("all");
		const id = `folder_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
		const newFolder = {
			id,
			name,
			platform,
			order: all.length,
			createdAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		all.push(newFolder);
		if (hasChromeStorage()) await chrome.storage.local.set({
			at_folders: all,
			stat_folders: all.length
		});
		await db.folders.put(newFolder);
		return id;
	}
	async function renameFolder(id, name) {
		const updated = (await getFolders("all")).map((f) => f.id === id ? {
			...f,
			name
		} : f);
		if (hasChromeStorage()) await chrome.storage.local.set({ at_folders: updated });
		await db.folders.update(id, { name });
	}
	async function deleteFolder(id) {
		const updated = (await getFolders("all")).filter((f) => f.id !== id);
		if (hasChromeStorage()) await chrome.storage.local.set({
			at_folders: updated,
			stat_folders: updated.length
		});
		await db.folders.delete(id);
		await db.chats.where("folderId").equals(id).modify((chat) => {
			delete chat.folderId;
		});
	}
	async function getPrompts() {
		let list = [];
		try {
			if (hasChromeStorage()) list = (await chrome.storage.local.get(["at_prompts"])).at_prompts || [];
		} catch (e) {}
		if (list.length === 0) list = await db.prompts.orderBy("usageCount").reverse().toArray();
		return list.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
	}
	async function incrementPromptUsage(id) {
		const updated = (await getPrompts()).map((p) => p.id === id ? {
			...p,
			usageCount: (p.usageCount || 0) + 1
		} : p);
		if (hasChromeStorage()) await chrome.storage.local.set({ at_prompts: updated });
		const p = await db.prompts.get(id);
		if (p) await db.prompts.update(id, { usageCount: (p.usageCount || 0) + 1 });
	}
	async function getSetting(key, defaultValue = null) {
		if (hasChromeStorage()) {
			const res = await chrome.storage.local.get([`setting_${key}`]);
			if (res[`setting_${key}`] !== void 0) return res[`setting_${key}`];
		}
		const row = await db.settings.get(key);
		return row ? row.value : defaultValue;
	}
	var FREE_LIMITS = {
		folders: 10,
		prompts: 20,
		searchResults: 5
	};
	async function checkLimit(resource) {
		if (await getSetting("tier", "free") === "pro") return { allowed: true };
		let count = 0;
		if (resource === "folders") count = (await getFolders("all")).length;
		else if (resource === "prompts") count = (await getPrompts()).length;
		else count = await db[resource].count();
		const limit = FREE_LIMITS[resource];
		return {
			allowed: count < limit,
			count,
			limit
		};
	}
	//#endregion
	//#region src/db/search-index.js
	/**
	* MiniSearch full-text index for AI chats.
	* Indexes: title + content
	* Sub-10ms search across 10,000+ messages.
	*
	* Key fix: `content` is now in storeFields so we can extract snippets
	* in the search modal. The `searchChats` function groups results by
	* platform and returns them as { chatgpt: [...], claude: [...] }.
	*/
	var searchIndex = null;
	var indexReady = false;
	function createIndex() {
		return new MiniSearch({
			fields: ["title", "content"],
			storeFields: [
				"id",
				"platform",
				"title",
				"url",
				"updatedAt",
				"content"
			],
			idField: "id",
			searchOptions: {
				boost: { title: 2 },
				fuzzy: .2,
				prefix: true
			}
		});
	}
	async function initSearchIndex() {
		if (searchIndex && indexReady) return;
		searchIndex = createIndex();
		indexReady = false;
		const docs = (await db.chats.toArray()).map((chat) => ({
			id: chat.id,
			platform: chat.platform,
			title: chat.title || "",
			url: chat.url || "",
			updatedAt: chat.updatedAt,
			content: (chat.messages || []).map((m) => m.content || "").join(" ").slice(0, 5e4)
		}));
		if (docs.length > 0) searchIndex.addAll(docs);
		indexReady = true;
		console.log(`[AI Toolbox] Search index ready: ${docs.length} chats indexed`);
	}
	async function indexChat(chat) {
		if (!indexReady || !searchIndex) await initSearchIndex();
		let messageContent = "";
		if (Array.isArray(chat.messages) && chat.messages.length > 0) messageContent = chat.messages.map((m) => m.content || "").join(" ").slice(0, 5e4);
		else {
			const existing = await db.chats.get(chat.id);
			if (existing?.messages?.length) messageContent = existing.messages.map((m) => m.content || "").join(" ").slice(0, 5e4);
		}
		const doc = {
			id: chat.id,
			platform: chat.platform,
			title: chat.title || "",
			url: chat.url || "",
			updatedAt: chat.updatedAt || /* @__PURE__ */ new Date(),
			content: messageContent
		};
		if (searchIndex.has(doc.id)) searchIndex.replace(doc);
		else searchIndex.add(doc);
	}
	/**
	* Unified cross-origin search.
	*
	* 1. Queries the local MiniSearch index (deep content search on current domain).
	* 2. Fetches `at_chats_meta` from chrome.storage.local (shared across ALL origins).
	* 3. Performs a fuzzy title search against cross-origin chat metadata.
	* 4. Merges + deduplicates by chat.id.
	* 5. Groups by platform → { chatgpt: [...], claude: [...] }
	*
	* This means pressing Ctrl+Shift+F on chatgpt.com will still show Claude
	* results (title-matched) and vice versa.
	*/
	async function searchChats(query, { platform, limit = 20 } = {}) {
		if (!indexReady || !searchIndex) await initSearchIndex();
		if (!query || query.trim().length < 1) return {};
		const q = query.trim().toLowerCase();
		const localResults = searchIndex.search(query, { filter: platform ? (result) => result.platform === platform : void 0 });
		const seenIds = /* @__PURE__ */ new Set();
		const merged = [];
		for (const result of localResults) {
			if (seenIds.has(result.id)) continue;
			seenIds.add(result.id);
			merged.push(result);
		}
		try {
			if (typeof chrome !== "undefined" && !!chrome?.storage?.local) {
				const metaMap = (await chrome.storage.local.get(["at_chats_meta"])).at_chats_meta || {};
				const allMeta = Object.values(metaMap);
				const terms = q.split(/\s+/).filter(Boolean);
				for (const meta of allMeta) {
					if (seenIds.has(meta.id)) continue;
					if (platform && meta.platform !== platform) continue;
					const titleLower = (meta.title || "").toLowerCase();
					if (terms.every((term) => titleLower.includes(term))) {
						seenIds.add(meta.id);
						merged.push({
							id: meta.id,
							platform: meta.platform,
							title: meta.title || "Untitled",
							url: meta.url || "",
							updatedAt: meta.updatedAt || null,
							content: "",
							score: .5,
							_crossOrigin: true
						});
					}
				}
			}
		} catch (e) {
			console.warn("[AI Toolbox] Cross-origin meta search failed:", e);
		}
		merged.sort((a, b) => (b.score || 0) - (a.score || 0));
		const grouped = {};
		let count = 0;
		for (const result of merged) {
			if (count >= limit) break;
			if (!grouped[result.platform]) grouped[result.platform] = [];
			grouped[result.platform].push(result);
			count++;
		}
		return grouped;
	}
	//#endregion
	//#region src/content/ui/sidebar.js
	/**
	* Sidebar — Folder tree + Pinned chats
	* Injected into the AI platform's sidebar via Shadow DOM.
	*/
	var SidebarUI = class {
		constructor(shadowRoot, platform) {
			this.shadow = shadowRoot;
			this.platform = platform;
			this.selectedFolderId = null;
			this.draggedChatId = null;
		}
		async render() {
			const container = this.shadow.getElementById("at-sidebar");
			if (!container) return;
			const [folders, pinnedChats] = await Promise.all([getFolders(this.platform), getAllChats(this.platform).then((chats) => chats.filter((c) => c.isPinned))]);
			container.innerHTML = `
      ${this._renderPinnedSection(pinnedChats)}
      ${this._renderFolderSection(folders)}
    `;
			this._bindEvents();
		}
		_renderPinnedSection(chats) {
			if (!chats.length) return "";
			return `
      <div class="at-pinned-section">
        <div class="at-sidebar-header">
          <span class="at-sidebar-title">📌 Pinned</span>
        </div>
        ${chats.map((c) => `
          <a href="${c.url}" class="at-pinned-chat" data-chat-id="${c.id}">
            <span class="at-pinned-chat-icon">💬</span>
            <span class="at-pinned-chat-title">${this._esc(c.title)}</span>
          </a>
        `).join("")}
      </div>
    `;
		}
		_renderFolderSection(folders) {
			return `
      <div class="at-sidebar-header">
        <span class="at-sidebar-title">📁 Folders</span>
        <button class="at-icon-btn" id="at-new-folder-btn" title="New folder">
          ${this._svgPlus()}
        </button>
      </div>
      <ul class="at-folder-list" id="at-folder-list">
        ${folders.length === 0 ? `<li class="at-empty-state">
               <div class="at-empty-icon">📂</div>
               <div class="at-empty-text">No folders yet.<br>Click + to create one.</div>
             </li>` : folders.map((f) => this._renderFolder(f)).join("")}
      </ul>
    `;
		}
		_renderFolder(folder) {
			return `
      <li class="at-folder-item ${this.selectedFolderId === folder.id ? "at-active" : ""}"
          data-folder-id="${folder.id}"
          draggable="false">
        <span class="at-folder-icon">📁</span>
        <span class="at-folder-name">${this._esc(folder.name)}</span>
        <div class="at-folder-actions">
          <button class="at-icon-btn at-rename-folder" data-folder-id="${folder.id}" title="Rename">
            ${this._svgPencil()}
          </button>
          <button class="at-icon-btn at-delete-folder" data-folder-id="${folder.id}" title="Delete">
            ${this._svgTrash()}
          </button>
        </div>
      </li>
    `;
		}
		_bindEvents() {
			this.shadow.getElementById("at-new-folder-btn")?.addEventListener("click", () => this._handleNewFolder());
			const folderList = this.shadow.getElementById("at-folder-list");
			if (!folderList) return;
			folderList.addEventListener("click", async (e) => {
				const renameBtn = e.target.closest(".at-rename-folder");
				const deleteBtn = e.target.closest(".at-delete-folder");
				const folderItem = e.target.closest(".at-folder-item");
				if (renameBtn) {
					e.stopPropagation();
					this._handleRename(renameBtn.dataset.folderId);
				} else if (deleteBtn) {
					e.stopPropagation();
					this._handleDelete(deleteBtn.dataset.folderId);
				} else if (folderItem) this._handleFolderSelect(folderItem.dataset.folderId);
			});
			folderList.addEventListener("contextmenu", (e) => {
				const folderItem = e.target.closest(".at-folder-item");
				if (folderItem) {
					e.preventDefault();
					this._showContextMenu(e.clientX, e.clientY, folderItem.dataset.folderId);
				}
			});
			folderList.querySelectorAll(".at-folder-item").forEach((item) => {
				item.addEventListener("dragover", (e) => {
					e.preventDefault();
					item.classList.add("at-drag-over");
				});
				item.addEventListener("dragleave", () => {
					item.classList.remove("at-drag-over");
				});
				item.addEventListener("drop", async (e) => {
					e.preventDefault();
					item.classList.remove("at-drag-over");
					const chatId = e.dataTransfer.getData("text/at-chat-id");
					const folderId = item.dataset.folderId;
					if (chatId && folderId) {
						await moveChatToFolder(chatId, folderId);
						await this.render();
					}
				});
			});
		}
		async _handleNewFolder() {
			const check = await checkLimit("folders");
			if (!check.allowed) {
				this._showLimitModal("folders", check.limit);
				return;
			}
			const name = await this._inlineInput("New folder name...");
			if (name?.trim()) {
				await createFolder({
					name: name.trim(),
					platform: this.platform
				});
				await this.render();
			}
		}
		async _handleRename(folderId) {
			const el = this.shadow.querySelector(`[data-folder-id="${folderId}"] .at-folder-name`);
			const currentName = el?.textContent || "";
			const name = await this._inlineInput("Rename folder...", currentName, el);
			if (name?.trim() && name !== currentName) {
				await renameFolder(folderId, name.trim());
				await this.render();
			}
		}
		async _handleDelete(folderId) {
			if (!confirm("Delete this folder? Chats inside will be unassigned.")) return;
			await deleteFolder(folderId);
			if (this.selectedFolderId === folderId) this.selectedFolderId = null;
			await this.render();
		}
		_handleFolderSelect(folderId) {
			this.selectedFolderId = folderId === this.selectedFolderId ? null : folderId;
			this.shadow.querySelectorAll(".at-folder-item").forEach((el) => {
				el.classList.toggle("at-active", el.dataset.folderId === this.selectedFolderId);
			});
			window.dispatchEvent(new CustomEvent("at_folder_selected", { detail: { folderId: this.selectedFolderId } }));
		}
		_showContextMenu(x, y, folderId) {
			this.shadow.querySelector(".at-context-menu")?.remove();
			const menu = document.createElement("div");
			menu.className = "at-context-menu";
			menu.style.cssText = `left:${x}px; top:${y}px;`;
			menu.innerHTML = `
      <div class="at-context-item" data-action="rename">✏️ Rename</div>
      <div class="at-context-separator"></div>
      <div class="at-context-item at-danger" data-action="delete">🗑️ Delete</div>
    `;
			menu.addEventListener("click", async (e) => {
				const action = e.target.closest("[data-action]")?.dataset.action;
				menu.remove();
				if (action === "rename") this._handleRename(folderId);
				if (action === "delete") this._handleDelete(folderId);
			});
			this.shadow.appendChild(menu);
			document.addEventListener("click", () => menu.remove(), { once: true });
		}
		_inlineInput(placeholder, defaultValue = "", targetEl = null) {
			return new Promise((resolve) => {
				const input = document.createElement("input");
				input.className = "at-inline-input";
				input.placeholder = placeholder;
				input.value = defaultValue;
				if (targetEl) targetEl.replaceWith(input);
				else this.shadow.getElementById("at-folder-list")?.prepend(input);
				input.focus();
				input.select();
				let finished = false;
				const done = (commit) => {
					if (finished) return;
					finished = true;
					const val = input.value;
					if (targetEl) input.replaceWith(targetEl);
					else input.remove();
					resolve(commit ? val : null);
				};
				input.addEventListener("keydown", (e) => {
					e.stopPropagation();
					if (e.key === "Enter") {
						e.preventDefault();
						done(true);
					}
					if (e.key === "Escape") {
						e.preventDefault();
						done(false);
					}
				});
				input.addEventListener("blur", () => done(false));
			});
		}
		_showLimitModal(resource, limit) {
			window.dispatchEvent(new CustomEvent("at_show_upgrade", { detail: { reason: `You've reached the free limit of ${limit} ${resource}.` } }));
		}
		_esc(str) {
			return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
		}
		_svgPlus() {
			return `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/></svg>`;
		}
		_svgPencil() {
			return `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zm-2.207 2.207L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>`;
		}
		_svgTrash() {
			return `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`;
		}
	};
	//#endregion
	//#region src/styles/shadow.css?inline
	var shadow_default = "/**\n * Shadow CSS — Injected into Shadow DOM\n */\n\n:host {\n  all: initial;\n  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;\n  color-scheme: dark light;\n}\n\n*,\n*::before,\n*::after {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n}\n\n/* ─── Sandcastle Theme Tokens ───────────────────────────────────────── */\n:host {\n  --at-bg: #1c1a18;\n  --at-bg-2: #25221f;\n  --at-surface: #302d29;\n  --at-surface-2: #3a3631;\n  --at-border: #3f3a35;\n  --at-border-hover: #544e47;\n\n  --at-accent: #df6b4b;\n  --at-accent-hover: #eb7c5e;\n  --at-accent-glow: rgba(223, 107, 75, 0.25);\n\n  --at-text: #f3efe9;\n  --at-text-muted: #b0a9a0;\n  --at-text-faint: #857e75;\n\n  --at-success: #34d399;\n  --at-warning: #fbbf24;\n  --at-danger: #f87171;\n\n  --at-radius-sm: 6px;\n  --at-radius: 10px;\n  --at-radius-lg: 16px;\n  --at-radius-xl: 20px;\n\n  --at-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);\n  --at-shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.5);\n  --at-shadow-accent: 0 0 24px var(--at-accent-glow);\n\n  --at-transition: 0.18s cubic-bezier(0.4, 0, 0.2, 1);\n  --at-sidebar-width: 240px;\n}\n\n/* ─── Scrollbars ─────────────────────────────────────────────────────── */\n::-webkit-scrollbar {\n  width: 4px;\n  height: 4px;\n}\n\n::-webkit-scrollbar-track {\n  background: transparent;\n}\n\n::-webkit-scrollbar-thumb {\n  background: var(--at-border-hover);\n  border-radius: 2px;\n}\n\n::-webkit-scrollbar-thumb:hover {\n  background: var(--at-text-faint);\n}\n\n/* ─── Sidebar ─────────────────────────────────────────────────────────── */\n.at-sidebar {\n  width: var(--at-sidebar-width);\n  background: var(--at-bg-2);\n  border-bottom: 1px solid var(--at-border);\n  padding: 8px 0 4px;\n  overflow: hidden;\n}\n\n.at-sidebar-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 6px 12px;\n  margin-bottom: 4px;\n}\n\n.at-sidebar-title {\n  font-size: 10px;\n  font-weight: 600;\n  letter-spacing: 0.08em;\n  text-transform: uppercase;\n  color: var(--at-text-faint);\n}\n\n.at-icon-btn {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 22px;\n  height: 22px;\n  border: none;\n  background: transparent;\n  border-radius: var(--at-radius-sm);\n  color: var(--at-text-muted);\n  cursor: pointer;\n  transition: background var(--at-transition), color var(--at-transition);\n}\n\n.at-icon-btn:hover {\n  background: var(--at-surface);\n  color: var(--at-text);\n}\n\n.at-icon-btn svg {\n  width: 14px;\n  height: 14px;\n  flex-shrink: 0;\n}\n\n/* ─── Folder List ─────────────────────────────────────────────────────── */\n.at-folder-list {\n  list-style: none;\n  padding: 0 6px;\n  display: flex;\n  flex-direction: column;\n  gap: 1px;\n}\n\n.at-folder-item {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  padding: 5px 6px;\n  border-radius: var(--at-radius-sm);\n  cursor: pointer;\n  transition: background var(--at-transition);\n  user-select: none;\n  position: relative;\n}\n\n.at-folder-item:hover {\n  background: var(--at-surface);\n}\n\n.at-folder-item.at-active {\n  background: var(--at-surface-2);\n}\n\n.at-folder-item.at-drag-over {\n  background: var(--at-accent-glow);\n  outline: 1px dashed var(--at-accent);\n}\n\n.at-folder-icon {\n  font-size: 13px;\n  flex-shrink: 0;\n}\n\n.at-folder-name {\n  flex: 1;\n  font-size: 13px;\n  color: var(--at-text);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.at-folder-actions {\n  display: none;\n  gap: 2px;\n  position: absolute;\n  right: 4px;\n}\n\n.at-folder-item:hover .at-folder-actions {\n  display: flex;\n}\n\n/* ─── Pinned Chats ───────────────────────────────────────────────────── */\n.at-pinned-section {\n  padding: 0 6px 4px;\n}\n\n.at-pinned-chat {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  padding: 4px 6px;\n  border-radius: var(--at-radius-sm);\n  cursor: pointer;\n  text-decoration: none;\n  transition: background var(--at-transition);\n}\n\n.at-pinned-chat:hover {\n  background: var(--at-surface);\n}\n\n.at-pinned-chat-icon {\n  font-size: 11px;\n  flex-shrink: 0;\n}\n\n.at-pinned-chat-title {\n  font-size: 12px;\n  color: var(--at-text-muted);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n/* ─── Search Modal Overlay ───────────────────────────────────────────── */\n.at-search-overlay {\n  position: fixed !important;\n  inset: 0 !important;\n  width: 100vw !important;\n  height: 100vh !important;\n  display: flex !important;\n  align-items: flex-start !important;\n  justify-content: center !important;\n  padding-top: 15vh !important;\n  z-index: 2147483647 !important;\n  background: rgba(20, 18, 16, 0.75) !important;\n  backdrop-filter: blur(4px) !important;\n  -webkit-backdrop-filter: blur(4px) !important;\n  animation: at-overlay-in var(--at-transition) ease;\n}\n\n@keyframes at-overlay-in {\n  from {\n    opacity: 0;\n  }\n\n  to {\n    opacity: 1;\n  }\n}\n\n.at-search-modal {\n  width: 650px !important;\n  max-width: 90vw !important;\n  max-height: 70vh;\n  background: var(--at-bg-2);\n  border: 1px solid var(--at-border);\n  border-radius: 12px !important;\n  box-shadow: var(--at-shadow-lg), var(--at-shadow-accent);\n  overflow: hidden;\n  display: flex;\n  flex-direction: column;\n  animation: at-modal-in 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);\n}\n\n@keyframes at-modal-in {\n  from {\n    opacity: 0;\n    transform: translateY(-20px) scale(0.97);\n  }\n\n  to {\n    opacity: 1;\n    transform: translateY(0) scale(1);\n  }\n}\n\n.at-search-header {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  padding: 14px 16px;\n  border-bottom: 1px solid var(--at-border);\n}\n\n.at-search-input {\n  flex: 1;\n  background: transparent;\n  border: none;\n  outline: none;\n  font-size: 18px !important;\n  font-family: inherit;\n  color: var(--at-text);\n}\n\n.at-search-input::placeholder {\n  color: var(--at-text-faint);\n}\n\n.at-search-close {\n  background: transparent;\n  border: none;\n  color: var(--at-text-muted);\n  cursor: pointer;\n  font-size: 16px;\n}\n\n.at-search-close:hover {\n  color: var(--at-text);\n}\n\n.at-platform-pills {\n  display: flex;\n  gap: 12px;\n  padding: 8px 16px;\n  border-bottom: 1px solid var(--at-border);\n  font-size: 12px;\n  background: var(--at-bg);\n}\n\n.at-pill {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  color: var(--at-text-muted);\n}\n\n.at-search-results {\n  flex: 1;\n  overflow-y: auto;\n  padding: 8px;\n}\n\n.at-search-platform-group {\n  margin-bottom: 8px;\n}\n\n.at-search-platform-label {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  padding: 4px 8px;\n  font-size: 10px;\n  font-weight: 600;\n  letter-spacing: 0.08em;\n  text-transform: uppercase;\n  color: var(--at-text-faint);\n}\n\n.at-search-platform-dot {\n  width: 6px;\n  height: 6px;\n  border-radius: 50%;\n}\n\n.at-platform-dot-chatgpt {\n  background: #10a37f;\n}\n\n.at-platform-dot-claude {\n  background: #d97706;\n}\n\n.at-platform-dot-gemini {\n  background: #3b82f6;\n}\n\n.at-platform-dot-grok {\n  background: #94a3b8;\n}\n\n.at-search-result {\n  display: flex;\n  flex-direction: column;\n  padding: 9px 12px;\n  border-radius: var(--at-radius);\n  cursor: pointer;\n  transition: background var(--at-transition);\n  text-decoration: none;\n}\n\n.at-search-result:hover,\n.at-search-result.at-selected {\n  background: var(--at-surface);\n}\n\n.at-result-top {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 2px;\n}\n\n.at-result-title {\n  font-size: 14px;\n  font-weight: 500;\n  color: var(--at-text);\n}\n\n.at-result-date {\n  font-size: 11px;\n  color: var(--at-text-faint);\n}\n\n.at-result-snippet {\n  font-size: 12px;\n  color: var(--at-text-muted);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.at-highlight {\n  background-color: var(--at-accent);\n  color: #1c1a18;\n  padding: 0 2px;\n  border-radius: 2px;\n  font-weight: 500;\n}\n\n.at-search-empty {\n  padding: 32px 16px;\n  text-align: center;\n  color: var(--at-text-faint);\n  font-size: 14px;\n}\n\n/* ─── Prompt Menu ─────────────────────────────────────────────────────── */\n.at-prompt-menu {\n  position: fixed;\n  z-index: 999998;\n  width: 320px;\n  max-height: 300px;\n  background: var(--at-bg-2);\n  border: 1px solid var(--at-border);\n  border-radius: var(--at-radius-lg);\n  box-shadow: var(--at-shadow-lg);\n  overflow: hidden;\n  display: flex;\n  flex-direction: column;\n  animation: at-modal-in 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);\n}\n\n.at-prompt-search {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 10px 12px;\n  border-bottom: 1px solid var(--at-border);\n}\n\n.at-prompt-search-icon {\n  font-size: 13px;\n  color: var(--at-accent);\n  flex-shrink: 0;\n}\n\n.at-prompt-search-input {\n  flex: 1;\n  background: transparent;\n  border: none;\n  outline: none;\n  font-size: 13px;\n  font-family: inherit;\n  color: var(--at-text);\n}\n\n.at-prompt-search-input::placeholder {\n  color: var(--at-text-faint);\n}\n\n.at-prompt-list {\n  flex: 1;\n  overflow-y: auto;\n  padding: 6px;\n}\n\n.at-prompt-item {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  padding: 8px 10px;\n  border-radius: var(--at-radius-sm);\n  cursor: pointer;\n  transition: background var(--at-transition);\n}\n\n.at-prompt-item:hover,\n.at-prompt-item.at-selected {\n  background: var(--at-surface);\n}\n\n.at-prompt-title {\n  font-size: 13px;\n  font-weight: 500;\n  color: var(--at-text);\n}\n\n.at-prompt-preview {\n  font-size: 11px;\n  color: var(--at-text-faint);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n/* ─── Export Button ───────────────────────────────────────────────────── */\n.at-export-btn {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  padding: 6px 12px;\n  background: var(--at-surface);\n  border: 1px solid var(--at-border);\n  border-radius: var(--at-radius-sm);\n  color: var(--at-text-muted);\n  font-size: 12px;\n  font-family: inherit;\n  cursor: pointer;\n  transition: all var(--at-transition);\n  white-space: nowrap;\n}\n\n.at-export-btn:hover {\n  background: var(--at-surface-2);\n  border-color: var(--at-border-hover);\n  color: var(--at-text);\n}\n\n.at-export-dropdown {\n  position: absolute;\n  top: calc(100% + 6px);\n  right: 0;\n  width: 180px;\n  background: var(--at-bg-2);\n  border: 1px solid var(--at-border);\n  border-radius: var(--at-radius);\n  box-shadow: var(--at-shadow);\n  overflow: hidden;\n  z-index: 100;\n  animation: at-modal-in 0.15s ease;\n}\n\n.at-export-option {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 9px 12px;\n  cursor: pointer;\n  font-size: 13px;\n  color: var(--at-text-muted);\n  transition: background var(--at-transition);\n}\n\n.at-export-option:hover {\n  background: var(--at-surface);\n  color: var(--at-text);\n}\n\n/* ─── Inline Input (folder rename) ───────────────────────────────────── */\n.at-inline-input {\n  background: var(--at-surface-2);\n  border: 1px solid var(--at-accent);\n  border-radius: 4px;\n  color: var(--at-text);\n  font-size: 13px;\n  font-family: inherit;\n  padding: 2px 6px;\n  outline: none;\n  width: 100%;\n}\n\n/* ─── Variable Fill Dialog ────────────────────────────────────────────── */\n.at-var-dialog {\n  position: fixed;\n  inset: 0;\n  z-index: 9999999;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background: rgba(0, 0, 0, 0.7);\n  backdrop-filter: blur(6px);\n}\n\n.at-var-dialog-box {\n  width: 400px;\n  background: var(--at-bg-2);\n  border: 1px solid var(--at-border);\n  border-radius: var(--at-radius-xl);\n  box-shadow: var(--at-shadow-lg);\n  padding: 20px;\n  animation: at-modal-in 0.2s ease;\n}\n\n.at-var-dialog-title {\n  font-size: 15px;\n  font-weight: 600;\n  color: var(--at-text);\n  margin-bottom: 12px;\n}\n\n.at-var-dialog-label {\n  font-size: 12px;\n  color: var(--at-text-muted);\n  margin-bottom: 4px;\n  margin-top: 10px;\n}\n\n.at-var-dialog-input {\n  width: 100%;\n  background: var(--at-surface);\n  border: 1px solid var(--at-border);\n  border-radius: var(--at-radius-sm);\n  color: var(--at-text);\n  font-size: 13px;\n  font-family: inherit;\n  padding: 8px 10px;\n  outline: none;\n  transition: border-color var(--at-transition);\n}\n\n.at-var-dialog-input:focus {\n  border-color: var(--at-accent);\n}\n\n.at-var-dialog-actions {\n  display: flex;\n  gap: 8px;\n  margin-top: 16px;\n  justify-content: flex-end;\n}\n\n.at-btn {\n  padding: 7px 14px;\n  border-radius: var(--at-radius-sm);\n  font-size: 13px;\n  font-family: inherit;\n  cursor: pointer;\n  transition: all var(--at-transition);\n  border: 1px solid transparent;\n}\n\n.at-btn-primary {\n  background: var(--at-accent);\n  color: white;\n  border-color: var(--at-accent);\n}\n\n.at-btn-primary:hover {\n  background: var(--at-accent-hover);\n}\n\n.at-btn-ghost {\n  background: transparent;\n  color: var(--at-text-muted);\n  border-color: var(--at-border);\n}\n\n.at-btn-ghost:hover {\n  background: var(--at-surface);\n  color: var(--at-text);\n}\n\n/* ─── Context menu ───────────────────────────────────────────────────── */\n.at-context-menu {\n  position: fixed;\n  z-index: 9999999;\n  background: var(--at-bg-2);\n  border: 1px solid var(--at-border);\n  border-radius: var(--at-radius);\n  box-shadow: var(--at-shadow);\n  overflow: hidden;\n  min-width: 160px;\n  animation: at-modal-in 0.12s ease;\n}\n\n.at-context-item {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 8px 12px;\n  font-size: 13px;\n  color: var(--at-text-muted);\n  cursor: pointer;\n  transition: background var(--at-transition);\n}\n\n.at-context-item:hover {\n  background: var(--at-surface);\n  color: var(--at-text);\n}\n\n.at-context-item.at-danger:hover {\n  background: rgba(248, 113, 113, 0.1);\n  color: var(--at-danger);\n}\n\n.at-context-separator {\n  height: 1px;\n  background: var(--at-border);\n  margin: 4px 0;\n}";
	//#endregion
	//#region src/content/ui/search-modal.js
	/**
	* Cmd+K / Ctrl+Shift+F Global Search Modal
	* Implements a document.body Portal to escape ChatGPT's sidebar CSS constraints.
	*/
	var SearchModal = class {
		constructor() {
			this.isOpen = false;
			this.selectedIndex = 0;
			this.results = {};
			this.flatResults = [];
			this.debounceTimer = null;
			this._setupKeyboardShortcut();
		}
		_setupKeyboardShortcut() {
			document.addEventListener("keydown", (e) => {
				if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "." || e.key === ">" || e.key.toLowerCase() === "f") || e.altKey && e.key.toLowerCase() === "k") {
					e.preventDefault();
					e.stopPropagation();
					this.toggle();
				}
				if (e.key === "Escape" && this.isOpen) this.close();
			});
			chrome.runtime?.onMessage?.addListener((msg) => {
				if (msg.type === "OPEN_SEARCH") this.open();
			});
		}
		toggle() {
			this.isOpen ? this.close() : this.open();
		}
		_getPortalShadow() {
			let portalHost = document.getElementById("at-search-portal-root");
			if (!portalHost) {
				portalHost = document.createElement("div");
				portalHost.id = "at-search-portal-root";
				document.body.appendChild(portalHost);
				const shadow = portalHost.attachShadow({ mode: "open" });
				const style = document.createElement("style");
				style.textContent = shadow_default;
				shadow.appendChild(style);
			}
			return document.getElementById("at-search-portal-root").shadowRoot;
		}
		async open() {
			if (this.isOpen) return;
			this.isOpen = true;
			await initSearchIndex();
			const portalShadow = this._getPortalShadow();
			portalShadow.getElementById("at-search-overlay")?.remove();
			const overlay = document.createElement("div");
			overlay.className = "at-search-overlay";
			overlay.id = "at-search-overlay";
			overlay.addEventListener("keydown", (e) => e.stopPropagation());
			overlay.addEventListener("keyup", (e) => e.stopPropagation());
			overlay.innerHTML = this._renderModal();
			portalShadow.appendChild(overlay);
			portalShadow.getElementById("at-search-input")?.focus();
			this._bindModalEvents(overlay, portalShadow);
		}
		close() {
			this.isOpen = false;
			this.selectedIndex = 0;
			this.results = {};
			this.flatResults = [];
			const portalShadow = document.getElementById("at-search-portal-root")?.shadowRoot;
			if (portalShadow) portalShadow.getElementById("at-search-overlay")?.remove();
		}
		_renderModal() {
			return `
      <div class="at-search-modal" role="dialog" aria-label="AI Toolbox Search">
        <div class="at-search-header">
          <input
            class="at-search-input"
            id="at-search-input"
            type="text"
            placeholder="Search all platforms..."
            autocomplete="off"
            spellcheck="false"
          />
          <button class="at-search-close" id="at-search-close-btn">✕</button>
        </div>
        <div id="at-platform-pills" class="at-platform-pills"></div>
        <div class="at-search-results" id="at-search-results">
          <div class="at-search-empty" id="at-search-placeholder">
            Start typing to search across ChatGPT, Claude, Gemini, and Grok...
          </div>
        </div>
      </div>
    `;
		}
		_bindModalEvents(overlay, portalShadow) {
			const input = portalShadow.getElementById("at-search-input");
			const resultsContainer = portalShadow.getElementById("at-search-results");
			const closeBtn = portalShadow.getElementById("at-search-close-btn");
			overlay.addEventListener("click", (e) => {
				if (e.target === overlay) this.close();
			});
			closeBtn?.addEventListener("click", () => this.close());
			input?.addEventListener("input", (e) => {
				clearTimeout(this.debounceTimer);
				const query = e.target.value.trim();
				this.debounceTimer = setTimeout(() => {
					this._performSearch(query, portalShadow);
				}, 150);
			});
			input?.addEventListener("keydown", async (e) => {
				if (e.key === "ArrowDown") {
					e.preventDefault();
					this.selectedIndex = Math.min(this.selectedIndex + 1, this.flatResults.length - 1);
					this._updateSelection(portalShadow);
				} else if (e.key === "ArrowUp") {
					e.preventDefault();
					this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
					this._updateSelection(portalShadow);
				} else if (e.key === "Enter") {
					e.preventDefault();
					const selected = this.flatResults[this.selectedIndex];
					if (selected?.url) {
						window.open(selected.url, "_blank");
						this.close();
					}
				}
			});
			resultsContainer?.addEventListener("click", (e) => {
				const resultEl = e.target.closest(".at-search-result");
				if (resultEl?.dataset.url) {
					window.open(resultEl.dataset.url, "_blank");
					this.close();
				}
			});
		}
		async _performSearch(query, portalShadow) {
			const resultsContainer = portalShadow.getElementById("at-search-results");
			const pillsContainer = portalShadow.getElementById("at-platform-pills");
			if (!resultsContainer) return;
			if (!query) {
				resultsContainer.innerHTML = `<div class="at-search-empty">Start typing to search across ChatGPT, Claude, Gemini, and Grok...</div>`;
				if (pillsContainer) pillsContainer.innerHTML = "";
				this.flatResults = [];
				return;
			}
			const grouped = await searchChats(query, { limit: await getSetting("tier", "free") === "pro" ? 50 : 10 });
			this.results = grouped;
			this.flatResults = [];
			this.selectedIndex = 0;
			for (const platform of Object.keys(grouped)) this.flatResults.push(...grouped[platform]);
			if (pillsContainer) pillsContainer.innerHTML = Object.entries(grouped).map(([platform, chats]) => `
        <span class="at-pill">
          <span class="at-search-platform-dot at-platform-dot-${platform}"></span>
          ${this._platformName(platform)} ${chats.length}
        </span>
      `).join("");
			if (this.flatResults.length === 0) {
				resultsContainer.innerHTML = `
        <div class="at-search-empty">
          No matches found for "<strong>${this._esc(query)}</strong>"
        </div>
      `;
				return;
			}
			resultsContainer.innerHTML = Object.entries(grouped).map(([platform, chats]) => `
      <div class="at-search-platform-group">
        <div class="at-search-platform-label">
          <span class="at-search-platform-dot at-platform-dot-${platform}"></span>
          ${this._platformName(platform)} <span class="at-match-count">${chats.length} matches</span>
        </div>
        ${chats.map((chat) => `
          <div class="at-search-result ${this.flatResults[this.selectedIndex]?.id === chat.id ? "at-selected" : ""}" 
               data-url="${this._esc(chat.url)}" data-id="${chat.id}">
            <div class="at-result-top">
              <div class="at-result-title">${this._highlight(chat.title, query)}</div>
              <div class="at-result-date">${this._formatDate(chat.updatedAt)}</div>
            </div>
            <div class="at-result-snippet">${this._highlight(chat.content ? chat.content.slice(0, 120) + "..." : "", query)}</div>
          </div>
        `).join("")}
      </div>
    `).join("");
			this._updateSelection(portalShadow);
		}
		_highlight(text, query) {
			if (!text || !query) return this._esc(text);
			const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const regex = new RegExp(`(${escapedQuery})`, "gi");
			return this._esc(text).replace(regex, "<mark class=\"at-highlight\">$1</mark>");
		}
		_updateSelection(portalShadow) {
			portalShadow.querySelectorAll(".at-search-result").forEach((el, i) => {
				el.classList.toggle("at-selected", i === this.selectedIndex);
				if (i === this.selectedIndex) el.scrollIntoView({
					block: "nearest",
					behavior: "smooth"
				});
			});
		}
		_platformName(platform) {
			return {
				chatgpt: "ChatGPT",
				claude: "Claude",
				gemini: "Gemini",
				grok: "Grok"
			}[platform] || platform;
		}
		_formatDate(date) {
			if (!date) return "";
			return new Date(date).toLocaleDateString("en-US", {
				month: "numeric",
				day: "numeric",
				year: "numeric"
			});
		}
		_esc(str) {
			return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
		}
	};
	//#endregion
	//#region src/content/ui/prompt-menu.js
	/**
	* Prompt Library — // Slash Trigger
	* Watches the active chat box for "//" using a global document keyup listener
	* to bypass React event handling inside contenteditable elements.
	*/
	var PromptMenu = class {
		constructor(shadowRoot, platform) {
			this.shadow = shadowRoot;
			this.platform = platform;
			this.isOpen = false;
			this.selectedIndex = 0;
			this.prompts = [];
			this.filteredPrompts = [];
			this.triggerEl = null;
			this.slashStart = -1;
			this._watchInputs();
		}
		_watchInputs() {
			document.addEventListener("keyup", (e) => {
				const activeEl = document.activeElement;
				if (!activeEl) return;
				if (!(activeEl.id === "prompt-textarea" || activeEl.getAttribute("contenteditable") === "true" || activeEl.tagName === "TEXTAREA")) return;
				const text = activeEl.contentEditable === "true" ? activeEl.innerText || activeEl.textContent || "" : activeEl.value || "";
				const slashMatch = text.match(/\/\/(\w*)$/);
				if (slashMatch) {
					this.triggerEl = activeEl;
					this.slashStart = text.length - slashMatch[0].length;
					if (!this.isOpen) this._openMenu(activeEl, slashMatch[1]);
				} else if (this.isOpen && !text.includes("//")) this.close();
			});
		}
		_bindInput(input) {}
		async _openMenu(inputEl, filter) {
			this.isOpen = true;
			this.prompts = await getPrompts();
			this._filterPrompts(filter);
			this.selectedIndex = 0;
			this._renderMenu(inputEl);
		}
		_filterPrompts(query) {
			const q = query.toLowerCase();
			this.filteredPrompts = q ? this.prompts.filter((p) => p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q)) : this.prompts;
		}
		_renderMenu(inputEl) {
			this._removeMenu();
			const rect = inputEl.getBoundingClientRect();
			const menu = document.createElement("div");
			menu.className = "at-prompt-menu";
			menu.id = "at-prompt-menu";
			menu.style.cssText = `
      position: fixed;
      left: ${Math.max(20, rect.left)}px;
      bottom: ${window.innerHeight - rect.top + 16}px;
      z-index: 999998;
    `;
			if (this.filteredPrompts.length === 0) menu.innerHTML = `
        <div class="at-prompt-search">
          <span class="at-prompt-search-icon">✨</span>
          <input class="at-prompt-search-input" placeholder="// No prompts saved yet..." readonly />
        </div>
        <div class="at-search-empty" style="padding:16px;font-size:12px;color:#8888a0;">
          Add prompts in your extension popup first!
        </div>
      `;
			else menu.innerHTML = `
        <div class="at-prompt-search">
          <span class="at-prompt-search-icon">✨</span>
          <input class="at-prompt-search-input" id="at-prompt-filter" placeholder="Filter prompts..." />
        </div>
        <div class="at-prompt-list" id="at-prompt-list">
          ${this.filteredPrompts.map((p, i) => `
            <div class="at-prompt-item ${i === 0 ? "at-selected" : ""}" data-index="${i}">
              <div class="at-prompt-title">${this._esc(p.title)}</div>
              <div class="at-prompt-preview">${this._esc(p.body.slice(0, 60))}${p.body.length > 60 ? "…" : ""}</div>
            </div>
          `).join("")}
        </div>
      `;
			this.shadow.appendChild(menu);
			const filterInput = menu.querySelector("#at-prompt-filter");
			filterInput?.focus();
			menu.addEventListener("mousedown", (e) => e.stopPropagation());
			filterInput?.addEventListener("input", (e) => {
				this._filterPrompts(e.target.value);
				const list = menu.querySelector("#at-prompt-list");
				if (list) {
					list.innerHTML = this.filteredPrompts.map((p, i) => `
          <div class="at-prompt-item ${i === 0 ? "at-selected" : ""}" data-index="${i}">
            <div class="at-prompt-title">${this._esc(p.title)}</div>
            <div class="at-prompt-preview">${this._esc(p.body.slice(0, 60))}${p.body.length > 60 ? "…" : ""}</div>
          </div>
        `).join("");
					this.selectedIndex = 0;
				}
			});
			menu.addEventListener("click", (e) => {
				const item = e.target.closest(".at-prompt-item");
				if (item) {
					const idx = parseInt(item.dataset.index);
					this.selectedIndex = idx;
					this._injectPrompt(this.filteredPrompts[idx]);
				}
			});
			setTimeout(() => {
				document.addEventListener("click", (e) => {
					if (!menu.contains(e.target) && e.target !== inputEl) this.close();
				}, { once: true });
			}, 100);
		}
		async _injectPrompt(prompt) {
			if (!prompt || !this.triggerEl) return;
			this.close();
			let body = prompt.body;
			const vars = [...body.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
			if (vars.length > 0) {
				const filled = await this._fillVariables(vars);
				if (!filled) return;
				for (const [varName, value] of Object.entries(filled)) body = body.replaceAll(`{{${varName}}}`, value);
			}
			if (this.triggerEl.contentEditable === "true") {
				const text = this.triggerEl.textContent || "";
				this.triggerEl.textContent = text.slice(0, this.slashStart) + body + text.slice(this.slashStart);
			} else {
				const val = this.triggerEl.value || "";
				const end = this.triggerEl.selectionStart || val.length;
				this.triggerEl.value = val.slice(0, this.slashStart) + body + val.slice(end);
			}
			this.triggerEl.dispatchEvent(new Event("input", { bubbles: true }));
			this.triggerEl.focus();
			await incrementPromptUsage(prompt.id);
		}
		_fillVariables(varNames) {
			return new Promise((resolve) => {
				const dialog = document.createElement("div");
				dialog.className = "at-var-dialog";
				dialog.innerHTML = `
        <div class="at-var-dialog-box">
          <div class="at-var-dialog-title">Fill in variables</div>
          ${varNames.map((v) => `
            <div class="at-var-dialog-label">{{${v}}}</div>
            <input class="at-var-dialog-input" data-var="${v}" placeholder="Enter value for ${v}..." />
          `).join("")}
          <div class="at-var-dialog-actions">
            <button class="at-btn at-btn-ghost" id="at-var-cancel">Cancel</button>
            <button class="at-btn at-btn-primary" id="at-var-confirm">Insert Prompt</button>
          </div>
        </div>
      `;
				this.shadow.appendChild(dialog);
				dialog.querySelector(".at-var-dialog-input")?.focus();
				const done = (commit) => {
					dialog.remove();
					if (!commit) {
						resolve(null);
						return;
					}
					const result = {};
					dialog.querySelectorAll("[data-var]").forEach((el) => {
						result[el.dataset.var] = el.value;
					});
					resolve(result);
				};
				dialog.querySelector("#at-var-confirm")?.addEventListener("click", () => done(true));
				dialog.querySelector("#at-var-cancel")?.addEventListener("click", () => done(false));
				dialog.addEventListener("keydown", (e) => {
					if (e.key === "Enter") done(true);
					if (e.key === "Escape") done(false);
				});
			});
		}
		_updateSelection() {
			this.shadow.querySelectorAll(".at-prompt-item").forEach((el, i) => {
				el.classList.toggle("at-selected", i === this.selectedIndex);
				if (i === this.selectedIndex) el.scrollIntoView({ block: "nearest" });
			});
		}
		close() {
			this.isOpen = false;
			this._removeMenu();
		}
		_removeMenu() {
			this.shadow.getElementById("at-prompt-menu")?.remove();
		}
		_esc(str) {
			return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
		}
	};
	//#endregion
	//#region src/content/ui/export-btn.js
	/**
	* Export Button — injected into the AI platform's chat toolbar.
	* Exports current chat as Markdown (.md) or Plain Text (.txt).
	* Uses Turndown for Markdown conversion.
	* 100% local — no server involved.
	*/
	var ExportButton = class {
		constructor(shadowRoot, platform) {
			this.shadow = shadowRoot;
			this.platform = platform;
			this._mounted = false;
			this._watchForToolbar();
		}
		_watchForToolbar() {
			new MutationObserver(() => this._tryMount()).observe(document.body, {
				childList: true,
				subtree: true
			});
			this._tryMount();
		}
		_tryMount() {
			if (document.getElementById("at-export-wrapper")) return;
			const toolbar = this._findToolbar();
			if (!toolbar) return;
			this._mount(toolbar);
		}
		_findToolbar() {
			return document.querySelector("main .sticky.top-0 .flex.items-center.gap-2") || document.querySelector("header.sticky") || document.querySelector("[data-testid=\"conversation-turn-counter\"]")?.parentElement;
		}
		_mount(toolbar) {
			this._mounted = true;
			const wrapper = document.createElement("div");
			wrapper.id = "at-export-wrapper";
			wrapper.style.cssText = "position:relative; display:inline-block;";
			const btn = document.createElement("button");
			btn.className = "at-export-btn";
			btn.id = "at-export-btn";
			btn.innerHTML = `<span>⬇️</span> Export`;
			btn.addEventListener("click", (e) => {
				e.stopPropagation();
				this._toggleDropdown(wrapper);
			});
			wrapper.appendChild(btn);
			toolbar.appendChild(wrapper);
		}
		_toggleDropdown(wrapper) {
			const existing = wrapper.querySelector(".at-export-dropdown");
			if (existing) {
				existing.remove();
				return;
			}
			const dropdown = document.createElement("div");
			dropdown.className = "at-export-dropdown";
			dropdown.innerHTML = `
      <div class="at-export-option" data-format="md">📝 Markdown (.md)</div>
      <div class="at-export-option" data-format="txt">📄 Plain Text (.txt)</div>
    `;
			dropdown.addEventListener("click", async (e) => {
				const format = e.target.closest("[data-format]")?.dataset.format;
				if (format) {
					dropdown.remove();
					await this._exportChat(format);
				}
			});
			wrapper.appendChild(dropdown);
			document.addEventListener("click", () => dropdown.remove(), { once: true });
		}
		async _exportChat(format) {
			const chatData = this._extractChatFromDOM();
			if (!chatData) {
				alert("Could not find chat content to export. Please try again.");
				return;
			}
			let content, filename, mimeType;
			if (format === "md") {
				content = this._toMarkdown(chatData);
				filename = `${this._sanitizeFilename(chatData.title)}.md`;
				mimeType = "text/markdown";
			} else {
				content = this._toPlainText(chatData);
				filename = `${this._sanitizeFilename(chatData.title)}.txt`;
				mimeType = "text/plain";
			}
			this._download(content, filename, mimeType);
		}
		_extractChatFromDOM() {
			const title = document.querySelector("title, h1, [data-testid=\"conversation-turn\"] h1, .font-semibold")?.textContent?.trim() || document.title.replace(" - ChatGPT", "").trim() || "Chat Export";
			const messages = [];
			if (this.platform === "chatgpt") document.querySelectorAll("[data-testid^=\"conversation-turn-\"]").forEach((turn) => {
				const role = turn.querySelector("[data-message-author-role]")?.dataset.messageAuthorRole || "unknown";
				const content = turn.querySelector(".markdown, [data-message-content]")?.textContent?.trim() || turn.textContent?.trim();
				if (content) messages.push({
					role,
					content
				});
			});
			else if (this.platform === "claude") document.querySelectorAll("[data-testid=\"human-turn\"], [data-testid=\"ai-turn\"]").forEach((turn) => {
				const role = turn.dataset.testid === "human-turn" ? "user" : "assistant";
				const content = turn.textContent?.trim();
				if (content) messages.push({
					role,
					content
				});
			});
			if (messages.length === 0) document.querySelectorAll("p, pre, li").forEach((block) => {
				const content = block.textContent?.trim();
				if (content && content.length > 10) messages.push({
					role: "unknown",
					content
				});
			});
			return {
				title,
				messages,
				platform: this.platform,
				exportedAt: /* @__PURE__ */ new Date()
			};
		}
		_toMarkdown({ title, messages, platform, exportedAt }) {
			const platformName = {
				chatgpt: "ChatGPT",
				claude: "Claude"
			}[platform] || platform;
			let md = `# ${title}\n\n`;
			md += `**Platform:** ${platformName}  \n`;
			md += `**Exported:** ${exportedAt.toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric"
			})}  \n`;
			md += `**Source:** [AI Toolbox Extension](https://chrome.google.com/webstore)\n\n---\n\n`;
			messages.forEach(({ role, content }) => {
				const roleLabel = role === "user" ? "## 🧑 You" : role === "assistant" ? "## 🤖 AI" : `## ${role}`;
				md += `${roleLabel}\n\n${content}\n\n---\n\n`;
			});
			return md;
		}
		_toPlainText({ title, messages, platform, exportedAt }) {
			const platformName = {
				chatgpt: "ChatGPT",
				claude: "Claude"
			}[platform] || platform;
			let txt = `${title}\n${"=".repeat(title.length)}\n\n`;
			txt += `Platform: ${platformName}\n`;
			txt += `Exported: ${exportedAt.toLocaleDateString("en-US")}\n\n`;
			txt += `${"─".repeat(60)}\n\n`;
			messages.forEach(({ role, content }) => {
				const label = role === "user" ? "YOU" : role === "assistant" ? "AI" : role.toUpperCase();
				txt += `[${label}]\n${content}\n\n${"─".repeat(60)}\n\n`;
			});
			return txt;
		}
		_download(content, filename, mimeType) {
			const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}
		_sanitizeFilename(name) {
			return name.replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, "_").slice(0, 100) || "chat_export";
		}
	};
	//#endregion
	//#region src/content/injector.js
	/**
	* ISOLATED World Content Script — Main Injector
	* 
	* This is the entry point that runs in the ISOLATED world (has access to
	* chrome.* APIs but NOT window.fetch directly).
	*/
	var hostname = window.location.hostname;
	var platform = hostname.includes("chatgpt.com") ? "chatgpt" : hostname.includes("claude.ai") ? "claude" : null;
	if (!platform) console.log("[AI Toolbox] Unknown platform, aborting injection.");
	else init();
	async function init() {
		console.log(`[AI Toolbox] Initializing on ${platform}`);
		if (document.getElementById("ai-toolbox-root")) {
			console.log("[AI Toolbox] Already injected, skipping.");
			return;
		}
		const sidebar = await waitForElement(getSidebarSelector(platform), 1e4);
		if (sidebar) console.log("[AI Toolbox] Sidebar found:", sidebar.tagName, sidebar.className.slice(0, 60));
		else console.warn("[AI Toolbox] No sidebar found — injecting as floating panel");
		const { host, shadowRoot } = createShadowHost(!!sidebar);
		if (sidebar) sidebar.insertBefore(host, sidebar.firstChild);
		else {
			host.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 16px;
      width: 240px;
      z-index: 999999;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      border-radius: 12px;
      overflow: hidden;
    `;
			document.body.appendChild(host);
		}
		const style = document.createElement("style");
		style.textContent = shadow_default;
		shadowRoot.appendChild(style);
		renderSidebarContainer(shadowRoot);
		const sidebarUI = new SidebarUI(shadowRoot, platform);
		new SearchModal(shadowRoot);
		new PromptMenu(shadowRoot, platform);
		new ExportButton(shadowRoot, platform);
		await sidebarUI.render();
		console.log("[AI Toolbox] UI rendered ✅");
		let indexQueue = Promise.resolve();
		window.addEventListener("at_chat_captured", (e) => {
			const chat = e.detail;
			if (!chat?.id) return;
			indexQueue = indexQueue.then(async () => {
				try {
					await upsertChat(chat);
					await indexChat(chat);
					await sidebarUI.render();
				} catch (err) {
					console.warn("[AI Toolbox] Indexing error:", err);
				}
			});
		});
		observeNavigationChanges(sidebarUI, host, sidebar, shadowRoot, platform);
		enableDraggableChats(platform);
	}
	function getSidebarSelector(platform) {
		return {
			chatgpt: [
				"nav[aria-label=\"Chat history\"]",
				"[data-testid=\"sidebar-history\"]",
				"nav[aria-label*=\"chat\" i]",
				"[scrollable=\"true\"]",
				"nav.flex-col",
				"aside",
				"#sidebar",
				"div[class*=\"sidebar\"]"
			].join(", "),
			claude: [
				"[data-testid=\"sidebar\"]",
				"nav[aria-label=\"Conversation list\"]",
				"nav[aria-label*=\"conversation\" i]",
				"aside",
				"div[class*=\"sidebar\"]",
				"#sidebar"
			].join(", ")
		}[platform] || "aside, nav";
	}
	function createShadowHost(inSidebar = true) {
		const host = document.createElement("div");
		host.id = "ai-toolbox-root";
		if (inSidebar) host.style.cssText = "display:block; width:100%; position:relative; z-index:10;";
		return {
			host,
			shadowRoot: host.attachShadow({ mode: "open" })
		};
	}
	function renderSidebarContainer(shadowRoot) {
		const container = document.createElement("div");
		container.id = "at-sidebar";
		container.className = "at-sidebar";
		shadowRoot.appendChild(container);
	}
	function waitForElement(selector, timeout = 5e3) {
		return new Promise((resolve) => {
			const selectors = selector.split(",").map((s) => s.trim());
			const tryFind = () => {
				for (const s of selectors) {
					const el = document.querySelector(s);
					if (el) return el;
				}
				return null;
			};
			const found = tryFind();
			if (found) return resolve(found);
			const observer = new MutationObserver(() => {
				const el = tryFind();
				if (el) {
					observer.disconnect();
					resolve(el);
				}
			});
			observer.observe(document.body, {
				childList: true,
				subtree: true
			});
			setTimeout(() => {
				observer.disconnect();
				resolve(null);
			}, timeout);
		});
	}
	function observeNavigationChanges(sidebarUI, host, originalSidebar, shadowRoot, platform) {
		new MutationObserver(async () => {
			if (!document.contains(host)) {
				const sidebar = await waitForElement(getSidebarSelector(platform), 3e3);
				if (sidebar) {
					sidebar.insertBefore(host, sidebar.firstChild);
					await sidebarUI.render();
				}
			}
		}).observe(document.body, {
			childList: true,
			subtree: true
		});
		let lastUrl = window.location.href;
		new MutationObserver(() => {
			if (window.location.href !== lastUrl) {
				lastUrl = window.location.href;
				setTimeout(() => sidebarUI.render(), 500);
			}
		}).observe(document.body, {
			childList: true,
			subtree: true
		});
	}
	function enableDraggableChats(platform) {
		let linkSelector, idExtractor, urlBuilder;
		if (platform === "chatgpt") {
			linkSelector = "nav a[href^=\"/c/\"]";
			idExtractor = (href) => href.match(/\/c\/([a-z0-9-]+)/i)?.[1];
			urlBuilder = (id) => `https://chatgpt.com/c/${id}`;
		} else if (platform === "claude") {
			linkSelector = "a[href^=\"/chat/\"]";
			idExtractor = (href) => href.match(/\/chat\/([a-z0-9-]+)/i)?.[1];
			urlBuilder = (id) => `https://claude.ai/chat/${id}`;
		} else return;
		const makeLinks = () => {
			document.querySelectorAll(linkSelector).forEach((link) => {
				if (link._atDraggable) return;
				link._atDraggable = true;
				link.draggable = true;
				const rawId = idExtractor(link.href);
				if (rawId) {
					const fullId = `${platform}_${rawId}`;
					const title = link.textContent?.trim() || "Untitled";
					window.dispatchEvent(new CustomEvent("at_chat_captured", { detail: {
						id: fullId,
						platform,
						title,
						url: urlBuilder(rawId),
						messages: null,
						updatedAt: /* @__PURE__ */ new Date()
					} }));
				}
				link.addEventListener("dragstart", (e) => {
					const id = idExtractor(link.href);
					if (id) e.dataTransfer.setData("text/at-chat-id", `${platform}_${id}`);
				});
			});
		};
		new MutationObserver(makeLinks).observe(document.body, {
			childList: true,
			subtree: true
		});
		makeLinks();
	}
	//#endregion
})();
