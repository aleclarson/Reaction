
# TODO: Make this work in NodeJS
#
# define = require "define"
#
# Reaction = require "../src/Reaction"
#
# describe "Reaction", ->
#
#   it "reacts to changes in any reactive value inside 'options.get'", ->
#     obj = define {}, foo: { value: 1, reactive: yes }
#     reaction = Reaction get: -> obj.foo
#     expect(reaction._value).toBe 1
#     obj.foo = 2
#     expect(reaction._value).toBe 2
