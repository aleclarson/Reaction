
emptyFunction = require "emptyFunction"
getArgProp = require "getArgProp"
Tracker = require "tracker"
assert = require "assert"
Event = require "Event"
Type = require "Type"

type = Type "Reaction"

type.defineStatics

  sync: (options = {}) ->
    options.async = no
    return Reaction options

type.createArguments (args) ->

  if args[0] instanceof Function
    args[0] = { get: args[0] }

  return args

type.trace()

type.defineOptions

  keyPath:
    type: String
    required: no

  async:
    type: Boolean
    default: yes

  firstRun:
    type: Boolean
    default: yes

  needsChange:
    type: Boolean
    default: yes

  willGet:
    type: Function
    default: emptyFunction.thatReturnsTrue

  get:
    type: Function.Kind
    required: yes

  willSet:
    type: Function
    default: emptyFunction.thatReturnsTrue

  didSet:
    type: Function
    required: no

type.defineFrozenValues

  didSet: (options) -> Event options.didSet

  _dep: -> Tracker.Dependency()

  _willGet: getArgProp "willGet"

  _get: getArgProp "get"

  _willSet: getArgProp "willSet"

type.defineValues

  _value: null

  _computation: null

  _async: getArgProp "async"

  _firstRun: getArgProp "firstRun"

  _needsChange: getArgProp "needsChange"

  _willNotify: no

type.initInstance (options) ->

  @keyPath = options.keyPath

  @start()

type.defineProperties

  isActive: get: ->
    @_computation and @_computation.isActive

  value: get: ->
    @_dep.depend() if @isActive
    @_value

  getValue: lazy: ->
    return => @value

  keyPath: didSet: (keyPath) ->
    @_computation.keyPath = keyPath if @_computation

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

    assert Tracker.isActive, "Tracker must be active!"

    return if not @_willGet()

    oldValue = @_value
    newValue = @_get()

    Tracker.nonreactive =>
      @_notify newValue, oldValue

  _notify: (newValue, oldValue) ->

    if not @_computation.isFirstRun

      # Some reactions need the value to differ for a change to be recognized.
      return if @_needsChange and (newValue is oldValue)

    return if not @_willSet newValue, oldValue

    @_value = newValue
    @_dep.changed()

    if @_computation.isFirstRun

      # Some reactions dont notify their listeners on the first run.
      return if not @_firstRun

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
