var Event, Reaction, Tracker, Type, assert, emptyFunction, fromArgs, type;

emptyFunction = require("emptyFunction");

fromArgs = require("fromArgs");

Tracker = require("tracker");

assert = require("assert");

Event = require("Event");

Type = require("Type");

type = Type("Reaction");

type.trace();

type.defineOptions({
  keyPath: String,
  async: Boolean.withDefault(true),
  firstRun: Boolean.withDefault(true),
  needsChange: Boolean.withDefault(true),
  willGet: Function.withDefault(emptyFunction.thatReturnsTrue),
  get: Function.Kind.isRequired,
  willSet: Function.withDefault(emptyFunction.thatReturnsTrue),
  didSet: Function
});

type.createArguments(function(args) {
  if (args[0] instanceof Function) {
    args[0] = {
      get: args[0]
    };
  }
  return args;
});

type.defineFrozenValues({
  didSet: function(options) {
    return Event(options.didSet);
  },
  _dep: function() {
    return Tracker.Dependency();
  },
  _willGet: fromArgs("willGet"),
  _get: fromArgs("get"),
  _willSet: fromArgs("willSet")
});

type.defineValues({
  _value: null,
  _computation: null,
  _async: fromArgs("async"),
  _firstRun: fromArgs("firstRun"),
  _needsChange: fromArgs("needsChange"),
  _notifying: false
});

type.initInstance(function(options) {
  this.keyPath = options.keyPath;
  return this.start();
});

type.defineGetters({
  isActive: function() {
    return this._computation && this._computation.isActive;
  },
  value: function() {
    if (this.isActive) {
      this._dep.depend();
    }
    return this._value;
  }
});

type.defineProperties({
  getValue: {
    lazy: function() {
      return (function(_this) {
        return function() {
          return _this.value;
        };
      })(this);
    }
  },
  keyPath: {
    didSet: function(keyPath) {
      return this._computation && (this._computation.keyPath = keyPath);
    }
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
            assert(Tracker.isActive, "Tracker must be active!");
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
      this._value = newValue;
      this._didUpdate(newValue, oldValue);
    }
  },
  _willUpdate: function(newValue, oldValue) {
    if (this._computation.isFirstRun) {
      return this._willSet(newValue);
    }
    if (this._needsChange && (newValue === oldValue)) {
      return false;
    }
    return this._willSet(newValue, oldValue);
  },
  _didUpdate: function(newValue, oldValue) {
    if (this._computation.isFirstRun) {
      if (!this._firstRun) {
        return;
      }
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
