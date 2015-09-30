var Immutable, NamedFunction, Reaction, ReactiveVar, Tracker, define, isType, ref, setType, steal, sync;

ref = require("type-utils"), setType = ref.setType, isType = ref.isType;

NamedFunction = require("named-function");

ReactiveVar = require("reactive-var");

Immutable = require("immutable");

sync = require("io").sync;

Tracker = require("tracker");

define = require("define");

steal = require("steal");

Reaction = NamedFunction("Reaction", function(options) {
  var reaction;
  reaction = setType({}, Reaction);
  if (isType(options, Function)) {
    options = {
      get: options
    };
  }
  define(reaction, function() {
    this.options = {};
    this({
      keyPath: options.keyPath,
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
    });
    this.enumerable = false;
    this({
      _value: ReactiveVar(),
      _willNotify: false,
      _stopped: true,
      _computation: null,
      _listeners: Immutable.Set(),
      _sync: steal(options, "_sync", false)
    });
    this.frozen = true;
    return this({
      __getNewValue: options.get
    });
  });
  if (isType(options.didSet, Function)) {
    reaction.addListener(function(newValue, oldValue) {
      return options.didSet(newValue, oldValue);
    });
  }
  if (isType(options.didChange, Function)) {
    reaction.addListener(function(newValue, oldValue) {
      if (this._computation.firstRun || (newValue === oldValue)) {
        return;
      }
      return options.didChange(newValue, oldValue);
    });
  }
  if (Reaction.autoStart) {
    reaction.start();
  }
  return reaction;
});

define(Reaction, function() {
  this.options = {};
  this({
    autoStart: true
  });
  this.frozen = true;
  return this({
    sync: function(options) {
      options._sync = true;
      return Reaction(options);
    }
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
          oldValue = _this.__getValue();
          newValue = _this.__getNewValue();
          return Tracker.nonreactive(function() {
            _this.value = newValue;
            if (_this._sync || _this._computation.firstRun) {
              return _this._notifyListeners();
            }
            if (_this._willNotify) {
              return;
            }
            _this._willNotify = true;
            return Tracker.afterFlush(function() {
              _this._willNotify = false;
              return _this._notifyListeners();
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
    }
  });
  this.enumerable = false;
  return this({
    __getValue: function() {
      return this._value.curValue;
    },
    _notifyListeners: function(oldValue) {
      return this._listeners.forEach(this._notifyListener.bind(this, this.value, oldValue));
    },
    _notifyListener: function(newValue, oldValue, listener) {
      return listener(newValue, oldValue);
    },
    _run: function() {}
  });
});

module.exports = Reaction;

//# sourceMappingURL=../../map/src/Reaction.map
