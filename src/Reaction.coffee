
require "isDev"

emptyFunction = require "emptyFunction"
getArgProp = require "getArgProp"
Tracker = require "tracker"
Tracer = require "tracer"
assert = require "assert"
Event = require "event"
Type = require "Type"

type = Type "Reaction"

type.createArguments (args) ->

  if args[0] instanceof Function
    args[0] = { get: args[0] }

  return args

type.optionTypes =
  keyPath: String.Maybe
  firstRun: Boolean
  needsChange: Boolean
  willGet: Function
  get: Function.Kind
  willSet: Function
  didSet: Function.Maybe

type.optionDefaults =
  firstRun: yes
  needsChange: yes
  willGet: emptyFunction.thatReturnsTrue
  willSet: emptyFunction.thatReturnsTrue

type.defineProperties

  isActive: get: ->
    c = @_computation
    c and c.isActive

  value: get: ->
    if Tracker.active and @_computation is Tracker.currentComputation
      @_dep.depend()
    @_value

  getValue: lazy: ->
    return => @value

  keyPath: didSet: (keyPath) ->
    @_computation.keyPath = keyPath if @_computation

type.defineFrozenValues

  didSet: (options) -> Event options.didSet

  _dep: -> Tracker.Dependency()

  _willGet: getArgProp "willGet"

  _get: getArgProp "get"

  _willSet: getArgProp "willSet"

if isDev
  type.defineFrozenValues
    _traceInit: -> Tracer "Reaction()"

type.defineValues

  _value: null

  _computation: null

  _async: (_, async = yes) -> async

  _firstRun: getArgProp "firstRun"

  _needsChange: getArgProp "needsChange"

  _willNotify: no

type.initInstance (options) ->
  @keyPath = options.keyPath
  @start()

type.defineStatics

  sync: (options) ->
    return Reaction options, no

type.defineMethods

  start: ->
    return if @isActive
    @_computation ?= Tracker.Computation
      keyPath: @keyPath
      async: @_async
      func: => @_recompute()
    @_computation.start()
    return

  stop: ->
    return unless @isActive
    @isActive = no
    @_computation.stop()
    return

  _recompute: ->

    assert Tracker.isActive, "Tracker must be active!"

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
    return @didSet.emit newValue, oldValue if not @_async

    # Asynchronous reactions batch any changes. Prevent duplicate events.
    return if @_willNotify
    @_willNotify = yes
    Tracker.afterFlush =>
      @_willNotify = no
      @didSet.emit newValue, oldValue

module.exports = Reaction = type.build()
