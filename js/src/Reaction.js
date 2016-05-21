var Event, Reaction, Tracer, Tracker, Type, assert, emptyFunction, type;

require("isDev");

emptyFunction = require("emptyFunction");

Tracker = require("tracker");

Tracer = require("tracer");

assert = require("assert");

Event = require("event");

Type = require("Type");

type = Type("Reaction");

type.createArguments(function(args) {
  if (args[0] instanceof Function) {
    args[0] = {
      get: args[0]
    };
  }
  return args;
});

type.optionTypes = {
  keyPath: String.Maybe,
  firstRun: Boolean,
  needsChange: Boolean,
  willGet: Function,
  get: Function.Kind,
  willSet: Function,
  didSet: Function.Maybe
};

type.optionDefaults = {
  sync: false,
  firstRun: true,
  needsChange: true,
  willGet: emptyFunction.thatReturnsTrue,
  willSet: emptyFunction.thatReturnsTrue
};

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
      if (Tracker.active) {
        if (this._computation !== Tracker.currentComputation) {
          this._dep.depend();
        }
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
  },
  inject: {
    get: function() {
      return injectable.inject;
    }
  }
});

type.defineFrozenValues({
  didSet: function(options) {
    return Event(options.didSet);
  },
  _dep: function() {
    return Tracker.Dependency();
  },
  _willGet: function(options) {
    return options.willGet;
  },
  _get: function(options) {
    return options.get;
  },
  _willSet: function(options) {
    return options.willSet;
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
  _sync: false,
  _firstRun: function(options) {
    return options.firstRun;
  },
  _needsChange: function(options) {
    return options.needsChange;
  },
  _willNotify: false
});

type.initInstance(function(options) {
  this.keyPath = options.keyPath;
  return this.start();
});

type.defineStatics({
  sync: function(options) {
    var reaction;
    reaction = Reaction(options);
    reaction._sync = true;
    return reaction;
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
        sync: this._sync,
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
    if (this._sync) {
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
