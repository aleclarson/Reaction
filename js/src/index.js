var NamedFunction, Reaction, Tracker, setType;

NamedFunction = require("named-function");

setType = require("type-utils").setType;

Tracker = require("tracker");

Reaction = NamedFunction("Reaction", function(options) {
  var reaction, value;
  value = null;
  reaction = Tracker.autorun(function() {
    var oldValue;
    oldValue = value;
    value = options.get();
    return Tracker.afterFlush(function() {
      return options.didSet(value, oldValue);
    });
  });
  return setType(reaction, Reaction);
});

module.exports = Reaction;

//# sourceMappingURL=../../map/src/index.map
