var Factory, Immutable, Reaction, ReactiveVar, Tracker, Void, assertType, define, emptyFunction, isType, ref, setType, sync;

require("lotus-require");

ref = require("type-utils"), setType = ref.setType, isType = ref.isType, assertType = ref.assertType, Void = ref.Void;

emptyFunction = require("emptyFunction");

ReactiveVar = require("reactive-var");

Immutable = require("immutable");

sync = require("io").sync;

Factory = require("factory");

Tracker = require("tracker");

define = require("define");

module.exports = Reaction = Factory("Reaction", {
  initArguments: function(config, context) {
    assertType(config, [Object, Function], "config");
    if (isType(config, Function)) {
      config = {
        get: config
      };
    }
    return [config, context];
  },
  optionTypes: {
    keyPath: [String, Void],
    get: [Function],
    didSet: [Function, Void],
    didChange: [Function, Void]
  },
  initValues: function(config, context) {
    return {
      keyPath: config.keyPath,
      _willNotify: false,
      _stopped: true,
      _computation: null,
      _listeners: Immutable.Set(),
      _context: context
    };
  },
  customValues: {
    value: {
      get: function() {
        if (this._computation === Tracker.currentComputation) {
          return this.__getValue();
        }
        return this._value.get();
      },
      set: function(newValue) {
        return this._value.set(newValue);
      }
    }
  },
  initFrozenValues: function(config) {
    return {
      _value: ReactiveVar(),
      _sync: config._sync != null ? config._sync : false,
      __getNewValue: config.get
    };
  },
  init: function(config) {
    if (config.didSet != null) {
      this.addListener((function(_this) {
        return function(newValue, oldValue) {
          return config.didSet.call(_this._context, newValue, oldValue);
        };
      })(this));
    }
    if (config.didChange != null) {
      this.addListener((function(_this) {
        return function(newValue, oldValue) {
          if (_this._computation.firstRun || (newValue === oldValue)) {
            return;
          }
          return config.didChange.call(_this._context, newValue, oldValue);
        };
      })(this));
    }
    if (Reaction.autoStart) {
      return this.start();
    }
  },
  initFactory: function() {
    return this.autoStart = true;
  },
  start: function() {
    if (!this._stopped) {
      return;
    }
    this._stopped = false;
    Tracker.autorun((function(_this) {
      return function() {
        var newValue, oldValue;
        _this._computation = Tracker.currentComputation;
        oldValue = _this.__getValue();
        newValue = _this.__getNewValue.call(_this._context);
        return Tracker.nonreactive(function() {
          _this.value = newValue;
          if (_this._sync || _this._computation.firstRun) {
            return _this._notifyListeners(oldValue);
          }
          if (_this._willNotify) {
            return;
          }
          _this._willNotify = true;
          return Tracker.afterFlush(function() {
            _this._willNotify = false;
            return _this._notifyListeners(oldValue);
          });
        });
      };
    })(this));
  },
  stop: function() {
    if (this._stopped) {
      return;
    }
    this._stopped = true;
    this._computation.stop();
    this._computation = null;
  },
  addListener: function(listener) {
    this._listeners = this._listeners.add(listener);
  },
  removeListener: function(listener) {
    this._listeners = this._listeners["delete"](listener);
  },
  fork: function(config) {
    var transform;
    assertType(config, [Object, Function]);
    transform = emptyFunction.thatReturnsArgument;
    if (isType(config, Function)) {
      transform = config;
      config = {};
    }
    config.get = (function(_this) {
      return function() {
        return transform(_this.value);
      };
    })(this);
    return Reaction(config);
  },
  statics: {
    sync: function(config) {
      config._sync = true;
      return Reaction(config);
    }
  },
  __getValue: function() {
    return this._value.curValue;
  },
  _notifyListeners: function(oldValue) {
    return this._listeners.forEach(this._notifyListener.bind(this, this.value, oldValue));
  },
  _notifyListener: function(newValue, oldValue, listener) {
    return listener.call(this, newValue, oldValue);
  }
});

//# sourceMappingURL=../../map/src/Reaction.map
