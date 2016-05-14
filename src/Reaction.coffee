
require "isDev"

emptyFunction = require "emptyFunction"
Injectable = require "Injectable"
Tracker = require "tracker"
Tracer = require "tracer"
assert = require "assert"
Event = require "event"
Type = require "Type"

injectable = Injectable.Map
  types: { autoStart: Boolean }
  values: { autoStart: yes }

type = Type "Reaction"

type.createArguments (args) ->

  if args[0] instanceof Function
    args[0] = { get: args[0] }

  return args

type.optionTypes =
  keyPath: String.Maybe
  firstRun: Boolean
  autoStart: Boolean.Maybe
  needsChange: Boolean
  willGet: Function
  get: Function.Kind
  willSet: Function
  didSet: Function.Maybe

type.optionDefaults =
  sync: no
  firstRun: yes
  needsChange: yes
  willGet: emptyFunction.thatReturnsTrue
  willSet: emptyFunction.thatReturnsTrue

type.defineProperties

  isActive: get: ->
    c = @_computation
    c and c.isActive

  value: get: ->
    if Tracker.active
      @_dep.depend() if @_computation isnt Tracker.currentComputation
    @_value

  getValue: lazy: ->
    return => @value

  keyPath: didSet: (keyPath) ->
    @_computation.keyPath = keyPath if @_computation

  inject: get: ->
    injectable.inject

type.defineFrozenValues

  didSet: (options) -> Event options.didSet

  _dep: -> Tracker.Dependency()

  _willGet: (options) -> options.willGet

  _get: (options) -> options.get

  _willSet: (options) -> options.willSet

if isDev
  type.defineFrozenValues
    _traceInit: -> Tracer "Reaction()"

type.defineValues

  _value: null

  _computation: null

  _sync: no

  _firstRun: (options) -> options.firstRun

  _needsChange: (options) -> options.needsChange

  _willNotify: no

type.initInstance (options) ->

  @keyPath = options.keyPath

  autoStart = options.autoStart

  if autoStart is undefined
    autoStart = injectable.autoStart

  @start() if autoStart

type.defineStatics

  sync: (options) ->
    reaction = Reaction options
    reaction._sync = yes
    reaction

type.defineMethods

  start: ->
    return if @isActive
    @_computation ?= new Tracker.Computation
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

module.exports = Reaction = type.build()
