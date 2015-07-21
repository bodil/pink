import transform from "babel-core/lib/babel/transformation";
import Promise from "bluebird";

module.exports = (CodeMirror, languages) => {

  function babel(code) {
    return new Promise((resolve, reject) => {
      try {
        resolve({
          code: transform(code).code, errors: []
        });
      } catch(e) {
        if (e instanceof SyntaxError) {
          resolve({
            errors: [{
              message: e.message,
              pos: { line: e.loc.line - 1, col: e.loc.column }
            }]
          });
        } else {
          reject(e);
        }
      }
    });
  }

  function Javascript() {
    this.cleanup = () => {};
    this.comment = (code) => "// " + code;
    this.compile = babel;
  }

  var out = Object.create(languages);
  out["text/javascript"] = Javascript;
  return out;

};
