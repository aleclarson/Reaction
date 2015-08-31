
console.log "isNodeEnv = " + isNodeEnv
console.log "cwd = " + process.cwd()

Reaction = require ".."

Tracker = require "tracker"
define = require "define"

foo = define {}, ->

  bar = 0
  car = 0
  dar = 0

  @options = reactive: yes
  @ { bar, car, dar }

reaction = Reaction

  get: ->
    console.log "Setting foo.bar"
    foo.bar

  didSet: (newValue, oldValue) ->
    console.log "Setting foo.car"
    foo.car = newValue + 1

Tracker.autorun ->
  console.log "Setting foo.dar"
  foo.dar = foo.bar + 1

Tracker.afterFlush ->
  foo.bar = 2

  Tracker.afterFlush ->
    log.format foo.bar, "foo.bar = "
    log.format foo.car, "foo.car = "
    log.format foo.dar, "foo.dar = "
