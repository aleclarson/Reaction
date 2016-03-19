
# reaction v1.0.0 [![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)

`Reaction` wraps around `Tracker.Computation` (from [meteor/tracker](https://github.com/meteor/meteor/tree/master/packages/tracker)).

#### Options:

- `get: Function.Kind`: Any reactive values accessed in here are tracked. The returned value is cached as `value`.

- `willGet: [ Function, Void ]`: Called before `get`. If `false` is returned, the reaction is cancelled.

- `willSet: [ Function, Void ]`: Called before `value` is updated. If `false` is returned, the `value` is never updated. Arguments are the `newValue` and `oldValue`.

- `firstRun: [ Boolean, Void ]`: If `false`, listeners are not called during the initial reaction. Defaults to `true`.

- `needsChange: [ Boolean, Void ]`: If `true`, the `newValue` and `oldValue` must be different values before the `value` is updated. This does not apply during the initial reaction. Defaults to `true`.

- `keyPath: [ String, Void ]`: An identity useful for debugging.

#### Properties:

- `value: Any { get }`: The reactive value returned by `options.get`!

- `keyPath: String { get, set }`

#### Methods:

- `start() -> Void`

- `stop() -> Void`: This must be called when the `Reaction` needs garbage collection.

- `getValue() -> Any`: This can be safely passed around.

- `addListener(listener: Function)`: Calls the `listener` whenever the `value` is updated. Arguments are the `newValue` and `oldValue`. A `stop` method is defined on the `listener` that you must call for garbage collection.

#### Statics:

- `autoStart: Boolean { get, set }`: Determines if each `Reaction` starts itself during construction.

- `sync(options: Object) -> Reaction`: Constructs a `Reaction` that skips reactive batching entirely (for instant reactions).
