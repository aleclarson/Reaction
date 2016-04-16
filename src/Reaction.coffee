
require "isDev"

{ isType
  setType
  assert
  assertType
  validateTypes } = require "type-utils"

emptyFunction = require "emptyFunction"
Injector = require "injector"
Tracker = require "tracker"
Factory = require "factory"
Tracer = require "tracer"
Event = require "event"

ReactionInjector = Injector "Reaction"
ReactionInjector.push "autoStart", yes

module.exports = Factory "Reaction",

  statics:

    sync: (options) ->
      reaction = Reaction options
      reaction._sync = yes
      reaction

  initArguments: (options) ->
    options = { get: options } if isType options, Function.Kind
    [ options ]

  optionTypes:
    keyPath: String.Maybe
    firstRun: Boolean
    autoStart: Boolean.Maybe
    needsChange: Boolean
    willGet: Function
    get: Function.Kind
    willSet: Function
    didSet: Function.Maybe

  optionDefaults:
    sync: no
    firstRun: yes
    needsChange: yes
    willGet: emptyFunction.thatReturnsTrue
    willSet: emptyFunction.thatReturnsTrue

  customValues:

    value: get: ->
      if Tracker.active
        @_dep.depend() if @_computation isnt Tracker.currentComputation
      @_value

    getValue: lazy: ->
      return => @value

    keyPath: didSet: (keyPath) ->
      @_computation.keyPath = keyPath if @_computation

  initFrozenValues: (options) ->

    didSet: Event options.didSet

    _dep: new Tracker.Dependency

    _willGet: options.willGet

    _get: options.get

    _willSet: options.willSet

    _traceInit: Tracer "Reaction()" if isDev

  initValues: (options) ->

    isActive: no

    _value: null

    _computation: null

    _sync: no

    _firstRun: options.firstRun

    _needsChange: options.needsChange

    _willNotify: no

    _refCount: 1

  init: (options) ->
    @keyPath = options.keyPath
    autoStart = options.autoStart
    autoStart = ReactionInjector.get "autoStart" if autoStart is undefined
    @start() if autoStart

  start: ->
    return if @isActive
    @isActive = yes
    unless @_computation
      @_computation = new Tracker.Computation
        keyPath: @keyPath
        sync: @_sync
        func: => @_recompute()
    @_computation.start()
    return

  stop: ->
    return unless @isActive
    @isActive = no
    @_computation.stop()
    return

  retain: ->
    @_refCount += 1

  release: ->
    return if @_refCount is 0
    @_refCount -= 1
    @stop() if @_refCount is 0

  _recompute: ->

    assert Tracker.active, "Tracker must be active!"

    return unless @_willGet()

    oldValue = @_value
    newValue = @_get()

    Tracker.nonreactive =>
      @_notify newValue, oldValue

  _notify: (newValue, oldValue) ->

    unless @_computation.firstRun

      # Some reactions need the value to differ for a change to be recognized.
      return if @_needsChange and (newValue is oldValue)

    return unless @_willSet newValue, oldValue

    @_value = newValue
    @_dep.changed()

    if @_computation.firstRun

      # Some reactions dont notify their listeners on the first run.
      return unless @_firstRun

      # Listeners are called immediately on the first run.
      return @didSet.emit newValue, oldValue

    # Synchronous reactions always call listeners immediately.
    return @didSet.emit newValue, oldValue if @_sync

    # Asynchronous reactions batch any changes. Prevent duplicate events.
    return if @_willNotify
    @_willNotify = yes
    Tracker.afterFlush =>
      @_willNotify = no
      @didSet.emit newValue, oldValue
