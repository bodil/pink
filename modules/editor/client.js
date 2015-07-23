const preservedState = {};

function evalCode(code) {
  setImmediate(function() {
    const module = preservedState;
    eval(code);
  });
}

function onMessage(e) {
  var message;
  try {
    message = JSON.parse(e.data);
  } catch(e) {
    return;
  }

  if (message.hasOwnProperty("key") && window.Mousetrap) {
    Mousetrap.trigger(message.key);
  }

  if (message.hasOwnProperty("code")) {
    evalCode(message.code);
  }
}

window.addEventListener("message", onMessage);
window.postMessage("rdy lol", "*");
