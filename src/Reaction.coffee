
{ setType, isType } = require "type-utils"
NamedFunction = require "named-function"
ReactiveVar = require "reactive-var"
Immutable = require "immutable"
{ sync } = require "io"
Tracker = require "tracker"
define = require "define"
steal = require "steal"

Reaction = NamedFunction "Reaction", (options) ->

  reaction = setType {}, Reaction

  if isType options, Function
    options = get: options

  define reaction, ->

    @options = {}
    @
      keyPath: options.keyPath
      value:
        get: ->
          # Prevent infinite loops. The reaction should not depend on its own value.
          return @__getValue() if @_computation is Tracker.currentComputation
          @_value.get()
        set: (newValue) ->
          @_value.set newValue

    @enumerable = no
    @
      _value: ReactiveVar()
      _willNotify: no
      _stopped: yes
      _computation: null
      _listeners: Immutable.Set()
      _sync: steal options, "_sync", no

    @frozen = yes
    @
      __getNewValue: options.get

  if isType options.didSet, Function
    reaction.addListener options.didSet

  if isType options.didChange, Function
    reaction.addListener (newValue, oldValue) ->
      return if reaction._computation.firstRun or (newValue is oldValue)
      options.didChange newValue, oldValue

  reaction.start() if Reaction.autoStart

  reaction

define Reaction, ->

  @options = {}
  @
    autoStart: yes

  @frozen = yes
  @
    sync: (options) ->
      options._sync = yes
      Reaction options

define Reaction.prototype, ->

  @options = frozen: yes
  @
    start: ->
      return unless @_stopped
      @_stopped = no
      Tracker.autorun =>
        @_computation = Tracker.currentComputation
        oldValue = @__getValue()
        newValue = @__getNewValue()
        Tracker.nonreactive =>
          @value = newValue
          return @_notifyListeners() if @_sync or @_computation.firstRun
          return if @_willNotify
          @_willNotify = yes
          Tracker.afterFlush =>
            @_willNotify = no
            @_notifyListeners()
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

  @enumerable = no
  @
    # Avoids triggering Tracker.Dependency.depend()
    __getValue: ->
      @_value.curValue

    _notifyListeners: (oldValue) ->
      @_listeners.forEach @_notifyListener.bind this, @value, oldValue

    _notifyListener: (newValue, oldValue, listener) ->
      listener newValue, oldValue

    _run: ->


module.exports = Reaction
