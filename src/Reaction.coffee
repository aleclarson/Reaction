
require "lotus-require"

{ Void
  Kind
  isType
  setType
  assert
  assertType
  validateTypes } = require "type-utils"

NamedFunction = require "named-function"
emptyFunction = require "emptyFunction"
Listenable = require "listenable"
Tracker = require "tracker"
define = require "define"

configTypes =
  keyPath: [ String, Void ]
  sync: [ Boolean, Void ]
  willGet: [ Function, Void ]
  get: Kind(Function)
  willSet: [ Function, Void ]
  didSet: [ Function, Void ]
  firstRun: [ Boolean, Void ]
  needsChange: [ Boolean, Void ]

module.exports =
Reaction = NamedFunction "Reaction", (config) ->

  assertType config, [ Object, configTypes.get ], "config"

  if isType config, configTypes.get
    config = { get: config }

  else # if __DEV__
    validateTypes config, configTypes

  self = setType {}, Reaction

  Listenable self, { eventNames: no }

  define self, ->

    @options = configurable: no
    @
      value: { get: Reaction._getValue }
      getValue: { lazy: -> Reaction._getValue.bind this }
      keyPath: {
        value: config.keyPath
        didSet: (keyPath) ->
          @_computation?.keyPath = keyPath
      }

    @enumerable = no
    @
      _value: null
      _stopped: yes
      _computation: null
      _sync: config.sync ?= no
      _firstRun: config.firstRun ?= yes
      _needsChange: config.needsChange ?= yes
      _willNotify: no

    @frozen = yes
    @
      _dep: new Tracker.Dependency
      _willGet: config.willGet ?= emptyFunction.thatReturnsTrue
      _get: config.get
      _willSet: config.willSet ?= emptyFunction.thatReturnsTrue
      _didSet: config.didSet
      _DEBUG: config.DEBUG

    Reaction._init.call self, config

define Reaction.prototype, ->

  @options = frozen: yes
  @
    start: ->
      return unless @_stopped
      @_stopped = no
      @_computation = new Tracker.Computation
        keyPath: @keyPath
        func: @_recordChange.bind this
        sync: @_sync
      @_computation.start()
      return

    stop: ->
      # TODO Involve a reference count.
      return if @_stopped
      @_stopped = yes
      @_computation.stop()
      @_computation = null
      return

  @enumerable = no
  @
    _recordChange: ->

      assert Tracker.active, "Tracker must be active!"

      return unless @_willGet()

      oldValue = @_value
      newValue = @_get()

      Tracker.nonreactive =>
        @_consumeChange newValue, oldValue

    _consumeChange: (newValue, oldValue) ->

      unless @_computation.firstRun

        # Some reactions need the value to differ for a change to be recognized.
        return if @_needsChange and (newValue is oldValue)

      return unless @_willSet newValue, oldValue

      if @_DEBUG
        @_newValues ?= []
        @_newValues.push newValue

      @_value = newValue
      @_dep.changed()

      if @_computation.firstRun

        # Some reactions dont notify their listeners on the first run.
        return unless @_firstRun

        # Listeners are called immediately on the first run.
        return @_emit newValue, oldValue

      # Synchronous reactions always call listeners immediately.
      return @_emit newValue, oldValue if @_sync

      # Asynchronous reactions batch any changes. Prevent duplicate events.
      return if @_willNotify
      @_willNotify = yes
      Tracker.afterFlush =>
        @_willNotify = no
        @_emit newValue, oldValue

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
          @_didSet.apply null, arguments

      config.autoStart ?= Reaction.autoStart
      @start() if config.autoStart

    _getValue: ->
      @_dep.depend() if Tracker.active and (@_computation isnt Tracker.currentComputation)
      @_value
