/*global WebSocket */

var text = require("../../../lib/text");

require("./codemirror-bodol");

module.exports = (languages) => {

  function BODOL() {

    var socket = new WebSocket("ws://localhost:31336");
    var queue = {};
    var counter = 0;

    socket.onopen = (event) => {
      console.log("socket open:", event);
    }

    socket.onerror = (event) => {
      console.error("socket error:", event);
    }

    socket.onmessage = (event) => {
      console.log("socket message:", event);
      let msg = JSON.parse(event.data);
      let id = msg.messageId;
      let callback = queue[id];
      if (callback) {
        delete queue[id];
        callback(msg);
      }
    }

    function send(obj, callback) {
      obj.messageId = "" + (++counter);
      queue[obj.messageId] = callback;
      let data = JSON.stringify(obj);
      console.log("socket send:", data);
      socket.send(data);
    }

    this.cleanup = function cleanup() {
      socket.close();
    }

    this.compile = function compile(code) {
      return {
        code: text.filterLines(code, /^;;(!!|=>)/),
        errors: []
      };
    }

    this.formAtPoint = function formAtPoint(src, point, callback) {
    }

    this.evalCode = function evalCode(form, callback) {
      send({eval: form, type: "text/x-bodol"}, callback);
    }

    this.comment = function comment(code) {
      return ";;" + code;
    }
  }

  var out = Object.create(languages);
  out["text/x-bodol"] = BODOL;
  return out;

};
