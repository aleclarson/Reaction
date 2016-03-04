var Kind, Listenable, NamedFunction, Reaction, Tracker, Void, assert, assertType, configTypes, define, emptyFunction, isType, ref, setType, validateTypes;

require("lotus-require");

ref = require("type-utils"), Void = ref.Void, Kind = ref.Kind, isType = ref.isType, setType = ref.setType, assert = ref.assert, assertType = ref.assertType, validateTypes = ref.validateTypes;

NamedFunction = require("named-function");

emptyFunction = require("emptyFunction");

Listenable = require("listenable");

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
  Listenable(self, {
    eventNames: false
  });
  return define(self, function() {
    this.options = {
      configurable: false
    };
    this({
      value: {
        get: Reaction._getValue
      },
      getValue: {
        lazy: function() {
          return Reaction._getValue.bind(this);
        }
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
      _willNotify: false
    });
    this.frozen = true;
    this({
      _dep: new Tracker.Dependency,
      _willGet: config.willGet != null ? config.willGet : config.willGet = emptyFunction.thatReturnsTrue,
      _get: config.get,
      _willSet: config.willSet != null ? config.willSet : config.willSet = emptyFunction.thatReturnsTrue,
      _didSet: config.didSet,
      _DEBUG: config.DEBUG
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
      return Tracker.nonreactive((function(_this) {
        return function() {
          return _this._consumeChange(newValue, oldValue);
        };
      })(this));
    },
    _consumeChange: function(newValue, oldValue) {
      if (!this._computation.firstRun) {
        if (this._needsChange && (newValue === oldValue)) {
          return;
        }
      }
      if (!this._willSet(newValue, oldValue)) {
        return;
      }
      if (this._DEBUG) {
        if (this._newValues == null) {
          this._newValues = [];
        }
        this._newValues.push(newValue);
      }
      this._value = newValue;
      this._dep.changed();
      if (this._computation.firstRun) {
        if (!this._firstRun) {
          return;
        }
        return this._notifyListeners(newValue, oldValue);
      }
      if (this._sync) {
        return this._notifyListeners(newValue, oldValue);
      }
      if (this._willNotify) {
        return;
      }
      this._willNotify = true;
      return Tracker.afterFlush((function(_this) {
        return function() {
          _this._willNotify = false;
          return _this._notifyListeners(newValue, oldValue);
        };
      })(this));
    },
    _notifyListeners: function(newValue, oldValue) {
      return this._listeners.forEach(function(listener) {
        listener(newValue, oldValue);
        return true;
      });
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
