
ReactiveVar = require "ReactiveVar"
Tracker = require "tracker"

Reaction = require ".."

describe "Reaction.sync", ->

  it "is active immediately after constructed", ->

    spy = jasmine.createSpy()
    reaction = Reaction.sync -> spy()

    expect reaction.isActive
      .toBe yes
    expect spy.calls.count()
      .toBe 1

  it "retains the return value of 'options.get'", ->
    reaction = Reaction.sync -> 1
    expect reaction.value
      .toBe 1

  it "emits 'this.didSet' when the value changes", ->

    value = ReactiveVar 0
    reaction = Reaction.sync -> value.get()

    listener = reaction.didSet spy = jasmine.createSpy()
    listener.start()

    value.set 1
    listener.stop()

    expect reaction.value
      .toBe 1
    expect spy.calls.count()
      .toBe 1

  it "has a reactive 'this.value'", ->

    value = ReactiveVar 0
    reaction = Reaction.sync -> value.get()

    spy = jasmine.createSpy()
    computation = Tracker.autorun -> spy reaction.value
    computation.isAsync = no

    value.set 1
    computation.stop()

    expect spy.calls.count()
    .toBe 2

    expect spy.calls.argsFor 0
      .toEqual [ 0 ]

    expect spy.calls.argsFor 1
      .toEqual [ 1 ]
