
Tracker = require "tracker"
isType = require "isType"
Event = require "Event"
Type = require "Type"

type = Type "Reaction"

type.trace()

type.createArgs (args) ->
  if isType args[0], Function
    args[0] =
      get: args[0]
      didSet: args[1]
  return args

type.defineArgs ->
  required: {get: yes}
  types:
    get: Function
    didSet: Function
    keyPath: String

type.defineFrozenValues (options) ->

  _get: options.get

  _didSet: Event options.didSet

type.defineValues (options) ->

  _keyPath: options.keyPath

  _computation: null

type.initInstance ->
  Reaction.didInit.emit this

type.defineBoundMethods

  _update: ->
    newValue = @_get()
    Tracker.nonreactive this, ->
      @_didSet.emit newValue
    return

#
# Prototype
#

type.defineGetters

  isActive: ->
    if @_computation
    then @_computation.isActive
    else no

  didSet: -> @_didSet.listenable

type.definePrototype

  keyPath:
    get: -> @_keyPath
    set: (keyPath) ->
      @_keyPath = keyPath
      @_computation?.keyPath = keyPath

type.defineMethods

  start: ->
    @_computation ?= Tracker.Computation @_update, {@keyPath, sync: yes}
    @_computation.start()
    return this

  stop: ->
    @_computation?.stop()
    return

type.defineStatics

  didInit: Event()

module.exports = Reaction = type.build()
