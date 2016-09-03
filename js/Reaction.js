var Event, Reaction, Tracker, Type, bind, emptyFunction, isType, type;

emptyFunction = require("emptyFunction");

Tracker = require("tracker");

isType = require("isType");

Event = require("Event");

Type = require("Type");

bind = require("bind");

type = Type("Reaction");

type.trace();

type.initArgs(function(args) {
  if (isType(args[0], Function)) {
    args[0] = {
      get: args[0]
    };
  }
});

type.defineOptions({
  get: Function.isRequired,
  didSet: Function,
  cacheResult: Boolean.withDefault(false),
  needsChange: Boolean.withDefault(true),
  keyPath: String
});

type.defineFrozenValues(function(options) {
  return {
    _get: options.get,
    _dep: options.cacheResult ? Tracker.Dependency() : void 0,
    _didSet: Event(options.didSet)
  };
});

type.defineValues(function(options) {
  return {
    _keyPath: options.keyPath,
    _value: options.cacheResult ? null : void 0,
    _computation: null,
    _cacheResult: options.cacheResult,
    _needsChange: options.cacheResult ? options.needsChange : void 0
  };
});

type.defineGetters({
  value: function() {
    if (isDev && !this._cacheResult) {
      throw Error("This reaction does not cache its result!");
    }
    if (Tracker.isActive) {
      this._dep.depend();
    }
    return this._value;
  },
  isActive: function() {
    if (!this._computation) {
      return false;
    }
    return this._computation.isActive;
  },
  didSet: function() {
    return this._didSet.listenable;
  }
});

type.definePrototype({
  keyPath: {
    get: function() {
      return this._keyPath;
    },
    set: function(keyPath) {
      this._keyPath = keyPath;
      return this._computation && (this._computation.keyPath = keyPath);
    }
  }
});

type.defineMethods({
  start: function() {
    if (!this.isActive) {
      if (this._computation == null) {
        this._computation = Tracker.Computation({
          func: bind.method(this, "update"),
          async: false,
          keyPath: this.keyPath
        });
      }
      this._computation.start();
    }
    return this;
  },
  stop: function() {
    if (this.isActive) {
      this._computation.stop();
    }
  },
  update: function() {
    var newValue, oldValue;
    newValue = this._get();
    if (this._cacheResult) {
      oldValue = this._value;
      this._value = newValue;
      this._dep.changed();
      this._didSet.emit(newValue, oldValue);
    } else {
      this._didSet.emit(newValue);
    }
  }
});

module.exports = Reaction = type.build();

//# sourceMappingURL=map/Reaction.map
