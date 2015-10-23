
require "lotus-require"

{ setType, isType, assertType, Void } = require "type-utils"
emptyFunction = require "emptyFunction"
ReactiveVar = require "reactive-var"
Immutable = require "immutable"
{ sync } = require "io"
Factory = require "factory"
Tracker = require "tracker"
define = require "define"

module.exports =
Reaction = Factory "Reaction",

  initArguments: (config, context) ->
    assertType config, [ Object, Function ], "config"
    config = { get: config } if isType config, Function
    [ config, context ]

  optionTypes:
    keyPath: [ String, Void ]
    get: [ Function ]
    didSet: [ Function, Void ]
    didChange: [ Function, Void ]

  initValues: (config, context) ->
    keyPath: config.keyPath
    _willNotify: no
    _stopped: yes
    _computation: null
    _listeners: Immutable.Set()
    _context: context

  customValues:

    value: {
      get: ->
        # Prevent infinite loops. The reaction should not depend on its own value.
        return @__getValue() if @_computation is Tracker.currentComputation
        @_value.get()

      set: (newValue) ->
        @_value.set newValue
    }

  initFrozenValues: (config) ->
    _value: ReactiveVar()
    _sync: if config._sync? then config._sync else no
    __getNewValue: config.get

  init: (config) ->

    if config.didSet?
      @addListener (newValue, oldValue) =>
        config.didSet.call @_context, newValue, oldValue

    if config.didChange?
      @addListener (newValue, oldValue) =>
        return if @_computation.firstRun or (newValue is oldValue)
        config.didChange.call @_context, newValue, oldValue

    @start() if Reaction.autoStart

  initFactory: ->
    @autoStart = yes

  start: ->
    return unless @_stopped
    @_stopped = no
    Tracker.autorun =>
      @_computation = Tracker.currentComputation
      oldValue = @__getValue()
      newValue = @__getNewValue.call @_context
      Tracker.nonreactive =>
        @value = newValue
        if @_sync or @_computation.firstRun
          return @_notifyListeners oldValue
        if @_willNotify
          return
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

  statics:

    sync: (config) ->
      config._sync = yes
      Reaction config

  # Avoids triggering Tracker.Dependency.depend()
  __getValue: ->
    @_value.curValue

  _notifyListeners: (oldValue) ->
    @_listeners.forEach @_notifyListener.bind this, @value, oldValue

  _notifyListener: (newValue, oldValue, listener) ->
    listener.call this, newValue, oldValue
