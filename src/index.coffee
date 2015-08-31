
NamedFunction = require "named-function"
{ setType } = require "type-utils"
Tracker = require "tracker"

Reaction = NamedFunction "Reaction", (options) ->

  value = null

  reaction = Tracker.autorun ->

    oldValue = value

    value = options.get()

    Tracker.afterFlush ->

      options.didSet value, oldValue

  setType reaction, Reaction

module.exports = Reaction
