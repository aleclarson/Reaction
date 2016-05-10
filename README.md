
# reaction 2.0.0 ![stable](https://img.shields.io/badge/stability-stable-4EBA0F.svg?style=flat)

The `Reaction` class wraps around `Tracker.Computation` (from [aleclarson/tracker](https://github.com/aleclarson/tracker)).

A `Reaction` is basically a function that is called when any of its reactive dependencies
are changed. A `Reaction` also caches the value returned by the function. Other `Reaction`
instances can depend on the cached value of any `Reaction`!

Even better, we can pass a `Reaction` to a `NativeValue` class (from [aleclarson/component](https://github.com/aleclarson/component))
and add that `NativeValue` to the style of a `React.View`. Once the `React.View`
is mounted, it will be automatically updated every time the cached value of the
`Reaction` is changed!!!

#### Options:

- `get: Function.Kind`: Any reactive values accessed in here are tracked. The returned value is cached as `value`.

- `willGet: [ Function, Void ]`: Called before `get`. If `false` is returned, the reaction is cancelled.

- `willSet: [ Function, Void ]`: Called before `value` is updated. If `false` is returned, the `value` is never updated. Arguments are the `newValue` and `oldValue`.

- `firstRun: [ Boolean, Void ]`: If `false`, listeners are not called during the initial reaction. Defaults to `true`.

- `needsChange: [ Boolean, Void ]`: If `true`, the `newValue` and `oldValue` must be different values before the `value` is updated. This does not apply during the initial reaction. Defaults to `true`.

- `keyPath: [ String, Void ]`: An identity useful for debugging.

#### Properties:

- `isActive: Boolean { get }`: Returns `true` if the function will be called when one of its dependencies has its value changed.

- `value: Any { get }`: The reactive value returned by `options.get`!

- `keyPath: String { get, set }`

- `didSet: Event { get }`: Emits whenever `this.value` is changed!

#### Methods:

- `start() -> Void`

- `stop() -> Void`: This must be called when the `Reaction` needs garbage collection.

- `getValue() -> Any`: This can be safely passed like `fn(this.getValue)`.

#### Statics:

- `sync(options: Object) -> Reaction`: Constructs a `Reaction` that skips reactive batching entirely (for instant reactions).
