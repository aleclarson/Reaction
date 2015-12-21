var Immutable, Kind, NamedFunction, Reaction, ReactiveVar, Tracker, Void, assertType, configTypes, define, emptyFunction, isKind, isType, ref, setType, sync, validateTypes;

require("lotus-require");

ref = require("type-utils"), Void = ref.Void, Kind = ref.Kind, isKind = ref.isKind, isType = ref.isType, setType = ref.setType, assertType = ref.assertType, validateTypes = ref.validateTypes;

NamedFunction = require("named-function");

emptyFunction = require("emptyFunction");

ReactiveVar = require("reactive-var");

Immutable = require("immutable");

sync = require("io").sync;

Factory = require("factory");

Tracker = require("tracker");

define = require("define");

configTypes = {
  keyPath: [String, Void],
  sync: [Boolean, Void],
  get: Kind(Function),
  didSet: [Function, Void],
  firstRun: [Boolean, Void],
  needsChange: [Boolean, Void]
};

module.exports = Reaction = NamedFunction("Reaction", function(config, context) {
  var self;
  assertType(config, [Object, Function.Kind], "config");
  if (isKind(config, Function)) {
    config = {
      get: config
    };
  } else {
    validateTypes(config, configTypes);
  }
  self = setType({}, Reaction);
  return define(self, function() {
    this.options = {
      configurable: false
    };
    this({
      keyPath: config.keyPath,
      value: {
        get: Reaction._getValue,
        set: Reaction._setValue
      }
    });
    this.enumerable = false;
    this({
      _oldValue: null,
      _willNotify: false,
      _stopped: true,
      _computation: null,
      _listeners: Immutable.Set(),
      _context: {
        value: config.context || context
      }
    });
    this.frozen = true;
    this({
      _value: ReactiveVar(),
      _sync: config.sync != null ? config.sync : config.sync = false,
      _notifyListener: Reaction._notifyListener.bind(self),
      __getNewValue: config.get
    });
    return Reaction._init.call(self, config);
  });
});

define(Reaction.prototype, function() {
  this.options = {
    frozen: true
  };
  this({
    start: function() {
      if (!this._stopped) {
        return;
      }
      this._stopped = false;
      Tracker.autorun((function(_this) {
        return function() {
          var newValue, oldValue;
          _this._computation = Tracker.currentComputation;
          if (_this._sync) {
            _this._computation.invalidate = Reaction._invalidateSync;
          }
          oldValue = _this.__getValue();
          newValue = _this.__getNewValue.call(_this._context);
          return Tracker.nonreactive(function() {
            _this.value = newValue;
            if (_this._sync || _this._computation.firstRun) {
              return _this._notifyListeners(oldValue);
            }
            if (!_this._willNotify) {
              _this._willNotify = true;
              return Tracker.afterFlush(function() {
                _this._willNotify = false;
                return _this._notifyListeners(oldValue);
              });
            }
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
    }
  });
  this.enumerable = false;
  return this({
    __getValue: function() {
      return this._value.curValue;
    },
    _notifyListeners: function(oldValue) {
      this._oldValue = oldValue;
      this._listeners.forEach(this._notifyListener);
      return this._oldValue = null;
    }
  });
});

define(Reaction, function() {
  this.options = {
    configurable: false
  };
  this({
    autoStart: true,
    sync: function(config) {
      config.sync = true;
      return Reaction(config);
    }
  });
  this.enumerable = false;
  return this({
    _getValue: function() {
      if (this._computation === Tracker.currentComputation) {
        return this.__getValue();
      }
      return this._value.get();
    },
    _setValue: function(newValue) {
      return this._value.set(newValue);
    },
    _init: function(config) {
      if (config.firstRun == null) {
        config.firstRun = true;
      }
      if (config.needsChange == null) {
        config.needsChange = true;
      }
      if (config.didSet != null) {
        this.addListener((function(_this) {
          return function(newValue, oldValue) {
            if ((config.firstRun === false) && _this._computation.firstRun) {
              return;
            }
            if ((config.needsChange === true) && (newValue === oldValue)) {
              return;
            }
            return config.didSet.call(_this._context, newValue, oldValue);
          };
        })(this));
      }
      if (config.autoStart == null) {
        config.autoStart = Reaction.autoStart;
      }
      if (config.autoStart) {
        return this.start();
      }
    },
    _invalidateSync: function() {
      this.invalidated = true;
      return this._recompute();
    },
    _notifyListener: function(listener) {
      return listener.call(this, this.value, this._oldValue);
    }
  });
});

//# sourceMappingURL=../../map/src/Reaction.map
