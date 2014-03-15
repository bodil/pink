/*global traceur, setTimeout */

var esprima = require("../esprima");
var _ = require("underscore");

var traceurCode = require("raw!traceur/bin/traceur.js");
('global', eval)(traceurCode); // I don't even

const traceurOptions = {
  modules: "commonjs",
  filename: "repl.js",
  blockBinding: true,
  symbols: true,
  deferredFunctions: true,
  types: true,
  annotations: true
};


module.exports = (languages) => {

  function compile(code) {
    traceur.options.reset();
    _.extend(traceur.options, traceurOptions);

    var errorReporter = new traceur.util.TestErrorReporter();
    var sourceFile = new traceur.syntax.SourceFile(traceurOptions.filename, code);
    var parser = new traceur.syntax.Parser(sourceFile, errorReporter);
    var tree = parser.parseModule();
    var transformer = new traceur.codegeneration.FromOptionsTransformer(errorReporter);
    var transformedTree = transformer.transform(tree);

    if (errorReporter.hadError()) {
      return {
        code: null,
        errors: errorReporter.errors.map((err) => {
          let [all, file, line, ch, msg] = /^([^:]*):(\d+):(\d+): (.*)$/.exec(err);
          line = parseInt(line, 10) -1; ch = parseInt(ch, 10) -1;
          return {pos: {line: line, ch: ch}, message: msg};
        })
      };
    } else {
      return {
        code: traceur.outputgeneration.TreeWriter.write(transformedTree),
        errors: []
      };
    }
  }

  function formAtPoint(src, point, callback) {
    const tree = esprima.parse(src, {
      tolerant: true, range: true
    });

    var form = tree.body.filter((n) => point >= n.range[0] && point <= n.range[1])[0];
    if (!form) return null;

    let start = form.range[0],
        end = form.range[1],
        form = src.slice(start, end),
        compiled = compile(form),
        result = {
          start: start, end: end, form: form
        };

    if (compiled.errors.length) {
      callback(compiled.errors, result);
    } else {
      result.compiled = compiled.code;
      callback(null, result);
    }
  }

  var preservedState = {};

  function evalCode(code, callback) {
    setTimeout(function() {
      var module = preservedState, result = {
        code: code
      };
      try {
        result.result = eval(code);
      } catch (err) {
        result.error = err;
      }
      callback(result);
    }, 1);
  }

  var Javascript = {
    compile: compile,
    formAtPoint: formAtPoint,
    evalCode: evalCode
  };

  var out = Object.create(languages);
  out["text/javascript"] = Javascript;
  return out;

};
