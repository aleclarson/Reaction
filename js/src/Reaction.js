var Event, Reaction, Tracer, Tracker, Type, assert, emptyFunction, getArgProp, type;

require("isDev");

emptyFunction = require("emptyFunction");

getArgProp = require("getArgProp");

Tracker = require("tracker");

Tracer = require("tracer");

assert = require("assert");

Event = require("Event");

Type = require("Type");

type = Type("Reaction");

type.defineStatics({
  sync: function(options) {
    if (options == null) {
      options = {};
    }
    options.async = false;
    return Reaction(options);
  }
});

type.createArguments(function(args) {
  if (args[0] instanceof Function) {
    args[0] = {
      get: args[0]
    };
  }
  return args;
});

type.defineOptions({
  keyPath: {
    type: String,
    required: false
  },
  async: {
    type: Boolean,
    "default": true
  },
  firstRun: {
    type: Boolean,
    "default": true
  },
  needsChange: {
    type: Boolean,
    "default": true
  },
  willGet: {
    type: Function,
    "default": emptyFunction.thatReturnsTrue
  },
  get: {
    type: Function.Kind,
    required: true
  },
  willSet: {
    type: Function,
    "default": emptyFunction.thatReturnsTrue
  },
  didSet: {
    type: Function,
    required: false
  }
});

type.defineFrozenValues({
  didSet: function(options) {
    return Event(options.didSet);
  },
  _dep: function() {
    return Tracker.Dependency();
  },
  _willGet: getArgProp("willGet"),
  _get: getArgProp("get"),
  _willSet: getArgProp("willSet"),
  _tracers: function() {
    if (isDev) {
      return {};
    }
  }
});

if (isDev) {
  type.defineFrozenValues({
    _traceInit: function() {
      return Tracer("Reaction()");
    }
  });
}

type.defineValues({
  _value: null,
  _computation: null,
  _async: getArgProp("async"),
  _firstRun: getArgProp("firstRun"),
  _needsChange: getArgProp("needsChange"),
  _willNotify: false
});

type.initInstance(function(options) {
  isDev && (this._tracers.init = Tracer("Reaction()"));
  this.keyPath = options.keyPath;
  return this.start();
});

type.defineProperties({
  isActive: {
    get: function() {
      var c;
      c = this._computation;
      return c && c.isActive;
    }
  },
  value: {
    get: function() {
      if (Tracker.active && this._computation === Tracker.currentComputation) {
        this._dep.depend();
      }
      return this._value;
    }
  },
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
      if (this._computation) {
        return this._computation.keyPath = keyPath;
      }
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
    this.isActive = false;
    this._computation.stop();
  },
  _recompute: function() {
    var newValue, oldValue;
    assert(Tracker.isActive, "Tracker must be active!");
    if (!this._willGet()) {
      return;
    }
    oldValue = this._value;
    newValue = this._get();
    return Tracker.nonreactive((function(_this) {
      return function() {
        return _this._notify(newValue, oldValue);
      };
    })(this));
  },
  _notify: function(newValue, oldValue) {
    if (!this._computation.firstRun) {
      if (this._needsChange && (newValue === oldValue)) {
        return;
      }
    }
    if (!this._willSet(newValue, oldValue)) {
      return;
    }
    this._value = newValue;
    this._dep.changed();
    if (this._computation.firstRun) {
      if (!this._firstRun) {
        return;
      }
      return this.didSet.emit(newValue, oldValue);
    }
    if (!this._async) {
      return this.didSet.emit(newValue, oldValue);
    }
    if (this._willNotify) {
      return;
    }
    this._willNotify = true;
    return Tracker.afterFlush((function(_this) {
      return function() {
        _this._willNotify = false;
        return _this.didSet.emit(newValue, oldValue);
      };
    })(this));
  }
});

module.exports = Reaction = type.build();

//# sourceMappingURL=../../map/src/Reaction.map
