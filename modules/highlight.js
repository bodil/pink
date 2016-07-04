/*global setTimeout */

var hl = require("highlight.js");

function Highlight(slide) {

  Array.prototype.forEach.call(slide.querySelectorAll("pre, code"), (el) => hl.highlightBlock(el));

}

module.exports = Highlight;
