var Immutable, Kind, NamedFunction, Reaction, Tracker, Void, assert, assertType, configTypes, define, emptyFunction, isType, ref, setType, sync, validateTypes;

require("lotus-require");

ref = require("type-utils"), Void = ref.Void, Kind = ref.Kind, isType = ref.isType, setType = ref.setType, assert = ref.assert, assertType = ref.assertType, validateTypes = ref.validateTypes;

sync = require("io").sync;

NamedFunction = require("named-function");

emptyFunction = require("emptyFunction");

Immutable = require("immutable");

Tracker = require("tracker");

define = require("define");

configTypes = {
  keyPath: [String, Void],
  sync: [Boolean, Void],
  willGet: [Function, Void],
  get: Kind(Function),
  willSet: [Function, Void],
  didSet: [Function, Void],
  firstRun: [Boolean, Void],
  needsChange: [Boolean, Void]
};

module.exports = Reaction = NamedFunction("Reaction", function(config) {
  var self;
  assertType(config, [Object, configTypes.get], "config");
  if (isType(config, configTypes.get)) {
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
      value: {
        get: Reaction._getValue
      },
      keyPath: {
        value: config.keyPath,
        didSet: function(keyPath) {
          var ref1;
          return (ref1 = this._computation) != null ? ref1.keyPath = keyPath : void 0;
        }
      }
    });
    this.enumerable = false;
    this({
      _value: null,
      _stopped: true,
      _computation: null,
      _sync: config.sync != null ? config.sync : config.sync = false,
      _firstRun: config.firstRun != null ? config.firstRun : config.firstRun = true,
      _needsChange: config.needsChange != null ? config.needsChange : config.needsChange = true,
      _willNotify: false,
      _listeners: Immutable.OrderedSet()
    });
    this.frozen = true;
    this({
      _dep: new Tracker.Dependency,
      _willGet: config.willGet != null ? config.willGet : config.willGet = emptyFunction.thatReturnsTrue,
      _get: config.get,
      _willSet: config.willSet != null ? config.willSet : config.willSet = emptyFunction.thatReturnsTrue,
      _didSet: config.didSet
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
      this._computation = new Tracker.Computation({
        keyPath: this.keyPath,
        func: this._recordChange.bind(this),
        sync: this._sync
      });
      this._computation.start();
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
      assertType(listener, Function);
      this._listeners = this._listeners.add(listener);
    },
    removeListener: function(listener) {
      this._listeners = this._listeners["delete"](listener);
    }
  });
  this.enumerable = false;
  return this({
    _recordChange: function() {
      var newValue, oldValue;
      assert(Tracker.active, "Tracker must be active!");
      if (!this._willGet()) {
        return;
      }
      oldValue = this._value;
      newValue = this._get();
      if (!this._computation.firstRun) {
        if (this._needsChange && (newValue === oldValue)) {
          return;
        }
      }
      return Tracker.nonreactive((function(_this) {
        return function() {
          return _this._consumeChange(newValue, oldValue);
        };
      })(this));
    },
    _consumeChange: function(newValue, oldValue) {
      if (!this._willSet(newValue, oldValue)) {
        return;
      }
      this._value = newValue;
      this._dep.changed();
      if (!(this._firstRun || !this._computation.firstRun)) {
        return;
      }
      if (this._sync || this._computation.firstRun) {
        this._listeners.forEach(function(listener) {
          listener(newValue, oldValue);
          return true;
        });
        return;
      }
      if (this._willNotify) {
        return;
      }
      this._willNotify = true;
      return Tracker.afterFlush((function(_this) {
        return function() {
          _this._willNotify = false;
          return _this._listeners.forEach(function(listener) {
            listener(newValue, oldValue);
            return true;
          });
        };
      })(this));
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
      if (isType(config, Function)) {
        config = {
          get: config
        };
      }
      config.sync = true;
      return Reaction(config);
    }
  });
  this.enumerable = false;
  return this({
    _init: function(config) {
      if (this._didSet != null) {
        this.addListener((function(_this) {
          return function() {
            return _this._didSet.apply(null, arguments);
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
    _getValue: function() {
      if (Tracker.active && (this._computation !== Tracker.currentComputation)) {
        this._dep.depend();
      }
      return this._value;
    }
  });
});

//# sourceMappingURL=../../map/src/Reaction.map
