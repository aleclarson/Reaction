
emptyFunction = require "emptyFunction"
fromArgs = require "fromArgs"
Tracker = require "tracker"
assert = require "assert"
Event = require "Event"
Type = require "Type"

type = Type "Reaction"

type.trace()

type.defineOptions
  keyPath: String
  async: Boolean.withDefault yes
  firstRun: Boolean.withDefault yes
  needsChange: Boolean.withDefault yes
  willGet: Function.withDefault emptyFunction.thatReturnsTrue
  get: Function.Kind.isRequired
  willSet: Function.withDefault emptyFunction.thatReturnsTrue
  didSet: Function

type.createArguments (args) ->

  if args[0] instanceof Function
    args[0] = { get: args[0] }

  return args

type.defineFrozenValues

  didSet: (options) -> Event options.didSet

  _dep: -> Tracker.Dependency()

  _willGet: fromArgs "willGet"

  _get: fromArgs "get"

  _willSet: fromArgs "willSet"

type.defineValues

  _value: null

  _computation: null

  _async: fromArgs "async"

  _firstRun: fromArgs "firstRun"

  _needsChange: fromArgs "needsChange"

  _notifying: no

type.initInstance (options) ->

  @keyPath = options.keyPath

  @start()

type.defineGetters

  isActive: ->
    @_computation and @_computation.isActive

  value: ->
    @_dep.depend() if @isActive
    @_value

type.defineProperties

  getValue: lazy: ->
    return => @value

  keyPath: didSet: (keyPath) ->
    @_computation and @_computation.keyPath = keyPath

type.defineMethods

  start: ->
    return if @isActive
    @_computation ?= Tracker.Computation
      keyPath: @keyPath
      async: @_async
      func: =>
        assert Tracker.isActive, "Tracker must be active!"
        @_recompute()
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
      @_value = newValue
      @_didUpdate newValue, oldValue
    return

  _willUpdate: (newValue, oldValue) ->
    return @_willSet newValue if @_computation.isFirstRun
    return no if @_needsChange and (newValue is oldValue)
    return @_willSet newValue, oldValue

  _didUpdate: (newValue, oldValue) ->

    if @_computation.isFirstRun

      # Some reactions dont notify their listeners on the first run.
      return if not @_firstRun

      # Listeners are called immediately on the first run.
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
