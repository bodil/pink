/*global setTimeout */

var events = require("../lib/events");

function Background(slide, url) {

  const preload = document.createElement("img");
  preload.src = url;

  // --- activate

  this.activate = () => {
    if (this.background) this.background.parentNode.removeChild(this.background);
    this.background = document.createElement("div");
    this.background.classList.add("background");
    this.background.style.backgroundImage = "url(" + url + ")";
    slide.parentNode.appendChild(this.background);
    setTimeout((() => {
      this.background.classList.add("active");
    }).bind(this), 1);
  }

  // --- cleanup

  this.cleanup = () => {
    if (this.background) {
      const bg = this.background;
      events.once(bg, events.vendorPrefix("TransitionEnd"), () => {
        bg.parentNode.removeChild(bg);
      }, this);
      bg.classList.remove("active");
      this.background = null;
    }
  }

}

module.exports = Background;
