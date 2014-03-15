var toArray = module.exports.toArray = function toArray(indexable) {
  var i, out = [], l = indexable.length;
  for (i = 0; i < l; i++) {
    out.push(indexable[i]);
  }
  return out;
}

module.exports.flatMap = function flatMap(f, seq) {
  var i, out = [], l = seq.length;
  for (i = 0; i < l; i++) {
    out = out.concat(f(seq[i]));
  }
  return out;
}

function copyProps(target, src) {
  var prop;
  for (prop in src) {
    if (src.hasOwnProperty(prop)) {
      target[prop] = src[prop];
    }
  }
  return target;
}

module.exports.merge = function merge(obj1) {
  return toArray(arguments).slice(1).reduce(function(acc, next) {
    return copyProps(acc, next);
  }, copyProps({}, obj1));
}
