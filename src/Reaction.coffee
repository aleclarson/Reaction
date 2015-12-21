
require "lotus-require"

{ Void, Kind, isKind, isType,
  setType, assertType, validateTypes } = require "type-utils"

NamedFunction = require "named-function"
emptyFunction = require "emptyFunction"
ReactiveVar = require "reactive-var"
Immutable = require "immutable"
{ sync } = require "io"
Factory = require "factory"
Tracker = require "tracker"
define = require "define"

configTypes =
  keyPath: [ String, Void ]
  sync: [ Boolean, Void ]
  get: Kind(Function)
  didSet: [ Function, Void ]
  firstRun: [ Boolean, Void ]
  needsChange: [ Boolean, Void ]

module.exports =
Reaction = NamedFunction "Reaction", (config, context) ->
  assertType config, [ Object, Function.Kind ], "config"
  if isKind config, Function then config = { get: config }
  else validateTypes config, configTypes
  self = setType {}, Reaction
  define self, ->

    @options = configurable: no
    @
      keyPath: config.keyPath
      value:
        get: Reaction._getValue
        set: Reaction._setValue

    @enumerable = no
    @
      _oldValue: null
      _willNotify: no
      _stopped: yes
      _computation: null
      _listeners: Immutable.Set()
      _context:
        value: config.context or context

    @frozen = yes
    @
      _value: ReactiveVar()
      _sync: config.sync ?= no
      _notifyListener: Reaction._notifyListener.bind self
      __getNewValue: config.get

    Reaction._init.call self, config

define Reaction.prototype, ->

  @options = frozen: yes
  @
    start: ->
      return unless @_stopped
      @_stopped = no

      Tracker.autorun =>
        @_computation = Tracker.currentComputation

        # Synchronous computations are recomputed immediately upon invalidation.
        @_computation.invalidate = Reaction._invalidateSync if @_sync

        oldValue = @__getValue()
        newValue = @__getNewValue.call @_context

        # Avoid depending on `this.value` or anything listeners reference.
        Tracker.nonreactive =>
          @value = newValue

          # Notify listeners in the same event loop as the invalidation.
          if @_sync or @_computation.firstRun
            return @_notifyListeners oldValue

          # Otherwise, notify listeners in the next event loop.
          unless @_willNotify
            @_willNotify = yes
            Tracker.afterFlush =>
              @_willNotify = no
              @_notifyListeners oldValue
      return

    stop: ->
      return if @_stopped
      @_stopped = yes
      @_computation.stop()
      @_computation = null
      return

    addListener: (listener) ->
      @_listeners = @_listeners.add listener
      return

    removeListener: (listener) ->
      @_listeners = @_listeners.delete listener
      return

    fork: (config) ->
      assertType config, [ Object, Function ]
      transform = emptyFunction.thatReturnsArgument
      if isType config, Function
        transform = config
        config = {}
      config.get = => transform @value
      Reaction config

  @enumerable = no
  @
    # Avoids triggering Tracker.Dependency.depend()
    __getValue: ->
      @_value.curValue

    _notifyListeners: (oldValue) ->
      @_oldValue = oldValue
      @_listeners.forEach @_notifyListener
      @_oldValue = null

define Reaction, ->

  @options = configurable: no
  @
    autoStart: yes

    sync: (config) ->
      config.sync = yes
      Reaction config

  @enumerable = no
  @
    _getValue: ->
      # Prevent infinite loops. The reaction should not depend on its own value.
      return @__getValue() if @_computation is Tracker.currentComputation
      @_value.get()

    _setValue: (newValue) ->
      @_value.set newValue

    _init: (config) ->
      config.firstRun ?= yes
      config.needsChange ?= yes
      if config.didSet?
        @addListener (newValue, oldValue) =>
          return if (config.firstRun is no) and @_computation.firstRun
          return if (config.needsChange is yes) and (newValue is oldValue)
          config.didSet.call @_context, newValue, oldValue
      config.autoStart ?= Reaction.autoStart
      @start() if config.autoStart

    _invalidateSync: ->
      @invalidated = yes
      @_recompute()

    _notifyListener: (listener) ->
      listener.call this, @value, @_oldValue
