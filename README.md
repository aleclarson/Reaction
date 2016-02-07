
# reaction v1.0.0 [![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)

```coffee
reaction = Reaction ->
  # Perform a side effect of some reactive value(s) here.
  # The returned value is cached.

reaction.value # A reaction's value is reactive, too!
```

Each `Reaction` must have its `stop()` method called. Otherwise a memory leak is introduced.

```coffee
reaction.stop()
```

The `didSet` option allows non-reactive side effects!

```coffee
reaction = Reaction
  get: -> # ...
  didSet: (newValue, oldValue) ->
    # Any reactive values accessed in here are NOT tracked.
```
