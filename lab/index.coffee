
Reaction = require ".."

define = require "define"

obj = define {}, foo: { value: 0, reactive: yes }

reaction = Reaction
  get: ->
    log.it "Getting new value..."
    obj.foo
  didSet: ->
    log.it "Did set value!"

# reaction.addListener (newValue) ->
#   log.format newValue, "newValue = "

setTimeout ->
  obj.foo = 2
, 100
