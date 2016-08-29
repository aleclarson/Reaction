
emptyFunction = require "emptyFunction"
Tracker = require "tracker"
Event = require "Event"
Type = require "Type"

type = Type "Reaction"

type.trace()

type.initArgs (args) ->
  if args[0] instanceof Function
    args[0] = get: args[0]
  return

type.defineOptions
  keyPath: String
  async: Boolean.withDefault yes
  get: Function.Kind.isRequired
  didSet: Function
  willGet: Function.withDefault emptyFunction.thatReturnsTrue
  willSet: Function.withDefault emptyFunction.thatReturnsTrue
  cacheResult: Boolean.withDefault no
  needsChange: Boolean.withDefault yes

type.defineFrozenValues (options) ->

  didSet: Event options.didSet

  _dep: Tracker.Dependency()

  _get: options.get

  _willGet: options.willGet

  _willSet: options.willSet

type.defineValues (options) ->

  _value: null

  _computation: null

  _async: options.async

  _cacheResult: options.cacheResult

  _needsChange: options.needsChange

  _notifying: no

type.initInstance (options) ->
  @keyPath = options.keyPath
  @start()

type.defineProperties

  keyPath: didSet: (keyPath) ->
    @_computation and @_computation.keyPath = keyPath

type.defineGetters

  isActive: ->
    return no if not @_computation
    return @_computation.isActive

  value: ->
    Tracker.isActive and @_dep.depend()
    return @_value

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
    return if not @isActive
    @_computation.stop()
    return

  _recompute: ->
    return if not @_willGet()
    oldValue = @_value
    newValue = @_get()
    Tracker.nonreactive =>
      @_update newValue, oldValue

  _update: (newValue, oldValue) ->
    if @_willUpdate newValue, oldValue
      @_cacheResult and @_value = newValue
      @_didUpdate newValue, oldValue
    return

  _willUpdate: (newValue, oldValue) ->

    if @_computation.isFirstRun
      return @_willSet newValue

    if @_needsChange and newValue is oldValue
      return no

    return @_willSet newValue, oldValue

  _didUpdate: (newValue, oldValue) ->

    # Listeners are called immediately on the first run.
    if @_computation.isFirstRun
      return @_notify newValue

    # Listeners are always called immediately for synchronous reactions.
    if not @_async
      return @_notify newValue, oldValue

    # Asynchronous reactions batch any changes. Prevent duplicate events.
    return if @_notifying
    @_notifying = yes
    Tracker.afterFlush =>
      @_notifying = no
      @_notify newValue, oldValue

  _notify: (newValue, oldValue) ->
    @_dep.changed()
    @didSet.emit newValue, oldValue

type.defineStatics

  sync: ->
    if arguments[0] instanceof Function
      options = { get: arguments[0] }
    else options = arguments[0] or {}
    options.async = no
    return Reaction options

module.exports = Reaction = type.build()
