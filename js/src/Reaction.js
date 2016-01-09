var Factory, Immutable, Kind, NamedFunction, Reaction, Tracker, Void, assertType, configTypes, define, emptyFunction, isKind, isType, ref, setType, sync, validateTypes;

require("lotus-require");

ref = require("type-utils"), Void = ref.Void, Kind = ref.Kind, isKind = ref.isKind, isType = ref.isType, setType = ref.setType, assertType = ref.assertType, validateTypes = ref.validateTypes;

NamedFunction = require("named-function");

emptyFunction = require("emptyFunction");

Immutable = require("immutable");

sync = require("io").sync;

Factory = require("factory");

Tracker = require("tracker");

define = require("define");

configTypes = {
  keyPath: [String, Void],
  sync: [Boolean, Void],
  shouldGet: [Function, Void],
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
        get: Reaction._getValue
      }
    });
    this.enumerable = false;
    this({
      _value: null,
      _change: null,
      _stopped: true,
      _computation: null,
      _sync: config.sync != null ? config.sync : config.sync = false,
      _firstRun: config.firstRun != null ? config.firstRun : config.firstRun = true,
      _needsChange: config.needsChange != null ? config.needsChange : config.needsChange = true,
      _willNotify: false,
      _listeners: Immutable.OrderedSet(),
      _context: {
        value: config.context != null ? config.context : config.context = context
      }
    });
    this.frozen = true;
    this({
      _dep: new Tracker.Dependency,
      _shouldGet: config.shouldGet != null ? config.shouldGet : config.shouldGet = emptyFunction.thatReturnsTrue,
      _get: config.get,
      _didSet: config.didSet,
      _recordChange: Reaction._recordChange.bind(self),
      _consumeChange: Reaction._consumeChange.bind(self),
      _notifyListener: Reaction._notifyListener.bind(self),
      _notifyListeners: Reaction._notifyListeners.bind(self)
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
      Tracker.autorun(this._recordChange);
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
    _enqueueChange: function(oldValue, newValue) {
      this._change = {
        oldValue: oldValue,
        newValue: newValue
      };
      return Tracker.nonreactive(this._consumeChange);
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
    _getValue: function() {
      if (Tracker.active && (this._computation !== Tracker.currentComputation)) {
        this._dep.depend();
      }
      return this._value;
    },
    _recordChange: function() {
      var newValue, oldValue;
      if (Tracker.active && (this._computation == null)) {
        this._computation = Tracker.currentComputation;
        this._computation._sync = this._sync;
      }
      if (!this._shouldGet.call(this._context)) {
        return;
      }
      oldValue = this._value;
      newValue = this._get.call(this._context);
      if (this._needsChange && (newValue === oldValue)) {
        return;
      }
      return this._enqueueChange(oldValue, newValue);
    },
    _consumeChange: function() {
      this._value = this._change.newValue;
      this._dep.changed();
      if (!(this._firstRun || !this._computation.firstRun)) {
        return;
      }
      if (this._sync || this._computation.firstRun) {
        return this._notifyListeners();
      }
      if (this._willNotify) {
        return;
      }
      this._willNotify = true;
      return Tracker.afterFlush(this._notifyListeners);
    },
    _notifyListeners: function() {
      this._willNotify = false;
      this._listeners.forEach(this._notifyListener);
      return this._change = null;
    },
    _notifyListener: function(listener) {
      listener.call(this, this._change.newValue, this._change.oldValue);
      return true;
    },
    _init: function(config) {
      if (this._didSet != null) {
        this.addListener((function(_this) {
          return function() {
            return _this._didSet.apply(_this._context, arguments);
          };
        })(this));
      }
      if (config.autoStart == null) {
        config.autoStart = Reaction.autoStart;
      }
      if (config.autoStart) {
        return this.start();
      }
    }
  });
});

//# sourceMappingURL=../../map/src/Reaction.map
