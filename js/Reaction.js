var Event, Reaction, Tracker, Type, emptyFunction, type;

emptyFunction = require("emptyFunction");

Tracker = require("tracker");

Event = require("Event");

Type = require("Type");

type = Type("Reaction");

type.trace();

type.initArgs(function(args) {
  if (args[0] instanceof Function) {
    args[0] = {
      get: args[0]
    };
  }
});

type.defineOptions({
  keyPath: String,
  async: Boolean.withDefault(true),
  get: Function.Kind.isRequired,
  didSet: Function,
  willGet: Function.withDefault(emptyFunction.thatReturnsTrue),
  willSet: Function.withDefault(emptyFunction.thatReturnsTrue),
  cacheResult: Boolean.withDefault(false),
  needsChange: Boolean.withDefault(true)
});

type.defineFrozenValues(function(options) {
  return {
    didSet: Event(options.didSet),
    _dep: Tracker.Dependency(),
    _get: options.get,
    _willGet: options.willGet,
    _willSet: options.willSet
  };
});

type.defineValues(function(options) {
  return {
    _value: null,
    _computation: null,
    _async: options.async,
    _cacheResult: options.cacheResult,
    _needsChange: options.needsChange,
    _notifying: false
  };
});

type.initInstance(function(options) {
  this.keyPath = options.keyPath;
  return this.start();
});

type.defineProperties({
  keyPath: {
    didSet: function(keyPath) {
      return this._computation && (this._computation.keyPath = keyPath);
    }
  }
});

type.defineGetters({
  isActive: function() {
    if (!this._computation) {
      return false;
    }
    return this._computation.isActive;
  },
  value: function() {
    Tracker.isActive && this._dep.depend();
    return this._value;
  }
});

type.defineMethods({
  start: function() {
    if (this.isActive) {
      return;
    }
    if (this._computation == null) {
      this._computation = Tracker.Computation({
        keyPath: this.keyPath,
        async: this._async,
        func: (function(_this) {
          return function() {
            return _this._recompute();
          };
        })(this)
      });
    }
    this._computation.start();
  },
  stop: function() {
    if (!this.isActive) {
      return;
    }
    this._computation.stop();
  },
  _recompute: function() {
    var newValue, oldValue;
    if (!this._willGet()) {
      return;
    }
    oldValue = this._value;
    newValue = this._get();
    return Tracker.nonreactive((function(_this) {
      return function() {
        return _this._update(newValue, oldValue);
      };
    })(this));
  },
  _update: function(newValue, oldValue) {
    if (this._willUpdate(newValue, oldValue)) {
      this._cacheResult && (this._value = newValue);
      this._didUpdate(newValue, oldValue);
    }
  },
  _willUpdate: function(newValue, oldValue) {
    if (this._computation.isFirstRun) {
      return this._willSet(newValue);
    }
    if (this._needsChange && newValue === oldValue) {
      return false;
    }
    return this._willSet(newValue, oldValue);
  },
  _didUpdate: function(newValue, oldValue) {
    if (this._computation.isFirstRun) {
      return this._notify(newValue);
    }
    if (!this._async) {
      return this._notify(newValue, oldValue);
    }
    if (this._notifying) {
      return;
    }
    this._notifying = true;
    return Tracker.afterFlush((function(_this) {
      return function() {
        _this._notifying = false;
        return _this._notify(newValue, oldValue);
      };
    })(this));
  },
  _notify: function(newValue, oldValue) {
    this._dep.changed();
    return this.didSet.emit(newValue, oldValue);
  }
});

type.defineStatics({
  sync: function() {
    var options;
    if (arguments[0] instanceof Function) {
      options = {
        get: arguments[0]
      };
    } else {
      options = arguments[0] || {};
    }
    options.async = false;
    return Reaction(options);
  }
});

module.exports = Reaction = type.build();

//# sourceMappingURL=map/Reaction.map
