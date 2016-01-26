
require "lotus-require"

{ Void, Kind, isKind, isType, setType, assertType, validateTypes } = require "type-utils"
{ sync } = require "io"

NamedFunction = require "named-function"
emptyFunction = require "emptyFunction"
Immutable = require "immutable"
Tracker = require "tracker"
define = require "define"

configTypes =
  keyPath: [ String, Void ]
  sync: [ Boolean, Void ]
  shouldGet: [ Function, Void ]
  get: Kind(Function)
  didSet: [ Function, Void ]
  firstRun: [ Boolean, Void ]
  needsChange: [ Boolean, Void ]

module.exports =
Reaction = NamedFunction "Reaction", (config, context) ->

  assertType config, [ Object, Function.Kind ], "config"

  if isKind config, Function
    config = { get: config }

  else # if __DEV__
    validateTypes config, configTypes

  self = setType {}, Reaction

  define self, ->

    @options = configurable: no
    @
      keyPath: config.keyPath
      value: { get: Reaction._getValue }

    @enumerable = no
    @
      _value: null
      _change: null
      _stopped: yes
      _computation: null
      _sync: config.sync ?= no
      _firstRun: config.firstRun ?= yes
      _needsChange: config.needsChange ?= yes
      _willNotify: no
      _listeners: Immutable.OrderedSet()
      _context: { value: config.context ?= context }

    @frozen = yes
    @
      _dep: new Tracker.Dependency
      _shouldGet: config.shouldGet ?= emptyFunction.thatReturnsTrue
      _get: config.get
      _didSet: config.didSet
      _changeQueue: config.changeQueue ?= Tracker.nonreactive
      _recordChange: Reaction._recordChange.bind self
      _consumeChange: Reaction._consumeChange.bind self
      _notifyListener: Reaction._notifyListener.bind self
      _notifyListeners: Reaction._notifyListeners.bind self

    Reaction._init.call self, config

define Reaction.prototype, ->

  @options = frozen: yes
  @
    start: ->
      return unless @_stopped
      @_stopped = no
      Tracker.autorun @_recordChange
      return

    stop: ->
      return if @_stopped
      @_stopped = yes
      @_computation.stop()
      @_computation = null
      return

    addListener: (listener) ->
      assertType listener, Function
      @_listeners = @_listeners.add listener
      return

    removeListener: (listener) ->
      @_listeners = @_listeners.delete listener
      return

  @enumerable = no
  @
    _enqueueChange: (oldValue, newValue) ->
      @_change = { oldValue, newValue }
      @_changeQueue @_consumeChange

define Reaction, ->

  @options = configurable: no
  @
    autoStart: yes

    sync: (config) ->
      config = get: config if isType config, Function
      config.sync = yes
      Reaction config

  @enumerable = no
  @
    _init: (config) ->

      if @_didSet?
        @addListener =>
          @_didSet.apply @_context, arguments

      config.autoStart ?= Reaction.autoStart
      @start() if config.autoStart

    _getValue: ->
      @_dep.depend() if Tracker.active and (@_computation isnt Tracker.currentComputation)
      @_value

    _recordChange: ->

      if Tracker.active and not @_computation?
        @_computation = Tracker.currentComputation
        @_computation._sync = @_sync

      return unless @_shouldGet.call @_context

      oldValue = @_value
      newValue = @_get.call @_context

      # Some reactions need the value to differ for a change to be recognized.
      return if @_needsChange and (newValue is oldValue)
      @_enqueueChange oldValue, newValue

    _consumeChange: ->

      @_value = @_change.newValue
      @_dep.changed()

      # Some reactions wait for a change before their first run.
      return unless @_firstRun or not @_computation.firstRun

      # Listeners are called immediately on the first run.
      # Synchronous reactions always call listeners immediately.
      if @_sync or @_computation.firstRun
        return @_notifyListeners()

      return if @_willNotify
      @_willNotify = yes
      Tracker.afterFlush @_notifyListeners

    _notifyListeners: ->
      @_willNotify = no
      @_listeners.forEach @_notifyListener
      @_change = null

    _notifyListener: (listener) ->
      listener.call this, @_change.newValue, @_change.oldValue
      yes
