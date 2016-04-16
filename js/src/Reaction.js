var Event, Factory, Injector, ReactionInjector, Tracer, Tracker, assert, assertType, emptyFunction, isType, ref, setType, validateTypes;

require("isDev");

ref = require("type-utils"), isType = ref.isType, setType = ref.setType, assert = ref.assert, assertType = ref.assertType, validateTypes = ref.validateTypes;

emptyFunction = require("emptyFunction");

Injector = require("injector");

Tracker = require("tracker");

Factory = require("factory");

Tracer = require("tracer");

Event = require("event");

ReactionInjector = Injector("Reaction");

ReactionInjector.push("autoStart", true);

module.exports = Factory("Reaction", {
  statics: {
    sync: function(options) {
      var reaction;
      reaction = Reaction(options);
      reaction._sync = true;
      return reaction;
    }
  },
  initArguments: function(options) {
    if (isType(options, Function.Kind)) {
      options = {
        get: options
      };
    }
    return [options];
  },
  optionTypes: {
    keyPath: String.Maybe,
    firstRun: Boolean,
    autoStart: Boolean.Maybe,
    needsChange: Boolean,
    willGet: Function,
    get: Function.Kind,
    willSet: Function,
    didSet: Function.Maybe
  },
  optionDefaults: {
    sync: false,
    firstRun: true,
    needsChange: true,
    willGet: emptyFunction.thatReturnsTrue,
    willSet: emptyFunction.thatReturnsTrue
  },
  customValues: {
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
    }
  },
  initFrozenValues: function(options) {
    return {
      didSet: Event(options.didSet),
      _dep: new Tracker.Dependency,
      _willGet: options.willGet,
      _get: options.get,
      _willSet: options.willSet,
      _traceInit: isDev ? Tracer("Reaction()") : void 0
    };
  },
  initValues: function(options) {
    return {
      isActive: false,
      _value: null,
      _computation: null,
      _sync: false,
      _firstRun: options.firstRun,
      _needsChange: options.needsChange,
      _willNotify: false,
      _refCount: 1
    };
  },
  init: function(options) {
    var autoStart;
    this.keyPath = options.keyPath;
    autoStart = options.autoStart;
    if (autoStart === void 0) {
      autoStart = ReactionInjector.get("autoStart");
    }
    if (autoStart) {
      return this.start();
    }
  },
  start: function() {
    if (this.isActive) {
      return;
    }
    this.isActive = true;
    if (!this._computation) {
      this._computation = new Tracker.Computation({
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
  retain: function() {
    return this._refCount += 1;
  },
  release: function() {
    if (this._refCount === 0) {
      return;
    }
    this._refCount -= 1;
    if (this._refCount === 0) {
      return this.stop();
    }
  },
  _recompute: function() {
    var newValue, oldValue;
    assert(Tracker.active, "Tracker must be active!");
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

//# sourceMappingURL=../../map/src/Reaction.map
