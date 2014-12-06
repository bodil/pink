/*global setTimeout */

// Patch in Traceur runtime
window.global = window;
require("traceur/bin/traceur-runtime");

require("./css/screen.less");

var mousetrap = require("./lib/mousetrap");
var hammer = require("hammerjs");
var events = require("./lib/events");
var seq = require("./lib/seq");

function Deck(container, deckModules) {

  if (typeof container === "string") {
    container = document.querySelector(container);
  }

  const slides = seq.toArray(container.querySelectorAll("section"));
  this.currentSlide = null;
  this.currentItem = null;

  const stream = seq.flatMap((slide) => {
    return [slide].concat(seq.toArray(slide.querySelectorAll(".fragment")));
  }, slides);

  function isFragment(node) {
    return node.classList.contains("fragment");
  }

  function fragmentSlide(node) {
    if (isFragment(node)) {
      while (node.nodeName !== "SECTION") {
        node = node.parentNode;
      }
    }
    return node;
  }

  slides.forEach((slide) => {
    const children = seq.toArray(slide.childNodes);
    const container = document.createElement("div");
    container.classList.add("slideContainer");
    children.forEach((child) => {
      slide.removeChild(child);
      container.appendChild(child);
    });
    slide.appendChild(container);
  });

  this.deactivateSlide = (slide) => {
    if (slide.classList.contains("current")) {
      slide.classList.add("out");
      slide.classList.remove("current");
    }
    this.currentSlide = null;
  }

  this.activateSlide = (slide) => {
    if (slide.classList.contains("out")) {
      this.cleanupModules(slide);
      slide.classList.remove("out");
    }
    if (this.currentSlide !== null) this.deactivateSlide(this.currentSlide);
    this.currentSlide = slide;

    this.activateModules(slide);

    slide.classList.add("current");
    slide.classList.add("in");
  }

  function applyFragment(from, to, f) {
    var node;
    for (let i = from; i <= to; i++) {
      node = stream[i];
      if (isFragment(node)) {
        f(node);
      }
    }
  }

  this.activateItem = (item) => {
    let itemSlide = fragmentSlide(stream[item]);
    if (this.currentItem !== null) {
      if (this.currentItem < item) {
        applyFragment(this.currentItem, item,
                      (node) => node.classList.add("active"));
      } else if (this.currentItem > item) {
        applyFragment(item + 1, this.currentItem,
                      (node) => node.classList.remove("active"));
      }
    } else {
      applyFragment(0, item, (node) => node.classList.add("active"));
      applyFragment(item + 1, stream.length - 1,
                    (node) => node.classList.remove("active"));
    }
    this.currentItem = item;
    if (this.currentSlide !== itemSlide) {
      this.activateSlide(itemSlide);
    }
    window.location.hash = "" + this.currentItem;
  };

  this.nextItem = () => {
    let nextItem = this.currentItem !== null ? this.currentItem + 1 : 0;
    if (nextItem >= stream.length) nextItem = stream.length - 1;
    if (nextItem !== this.currentItem) this.activateItem(nextItem);
  }

  this.previousItem = () => {
    let prevItem = this.currentItem !== null ? this.currentItem - 1 : 0;
    if (prevItem < 0) prevItem = 0;
    if (prevItem !== this.currentItem) this.activateItem(prevItem);
  }

  this.initModules = (slide) => {
    let slideData = slide.dataset,
        deckData = container.dataset;
    let mods = [], mod;
    for (mod in deckModules) {
      if (deckModules.hasOwnProperty(mod)) {
        let arg = slideData.hasOwnProperty(mod) ? slideData[mod] :
              deckData.hasOwnProperty(mod) ? deckData[mod] : null;
        if (arg) mods.push(new deckModules[mod](slide, arg));
      }
    }
    slide._deck_modules = mods;
  }

  this.activateModules = (slide) => {
    slide._deck_modules.forEach((mod) => mod.activate && mod.activate());
  }

  this.stabiliseModules = (slide) => {
    slide._deck_modules.forEach((mod) => mod.stabilise && mod.stabilise());
  }

  this.cleanupModules = (slide) => {
    slide._deck_modules.forEach((mod) => mod.cleanup && mod.cleanup());
  }

  this.transitionEnd = (e) => {
    let slide = e.target;
    if (slide.classList.contains("out")) {
      slide.classList.remove("out");
      this.cleanupModules(slide);
    } else if (slide.classList.contains("in")) {
      slide.classList.remove("in");
      this.stabiliseModules(slide);
    }
  }

  this.rescale = () => {
    const screenw = window.innerWidth,
          screenh = window.innerHeight;

    const targetw = 1280,
          targeth = 720;

    const targetScale = Math.min(screenw / targetw, screenh / targeth);

    container.style.zoom = targetScale;
  }

  events.on(window, "resize", this.rescale, this);

  slides.forEach(((slide) => this.initModules(slide)).bind(this));

  events.on(container, events.vendorPrefix("TransitionEnd"), this.transitionEnd, this);

  this.onTouchStart = (e) => {
    this.touching = e.touches.length ? {
      sx: e.touches[0].screenX, sy: e.touches[0].screenY
    } : null;
  }

  this.onTouchMove = (e) => {
    this.touching = e.touches.length ? {
      sx: this.touching.sx, sy: this.touching.sy,
      ex: e.touches[0].screenX, ey: e.touches[0].screenY
    } : null;
  }

  this.onTouchEnd = (e) => {
    if (this.touching) {
      const x = this.touching.ex - this.touching.sx,
            y = this.touching.ey - this.touching.sy,
            r = Math.sqrt(x*x + y*y),
            a = Math.atan2(y, x);
      this.touching = null;
      if (r > 20) {
        if (a > -Math.PI/4 && a < Math.PI/4) {
          // right swipe
          this.previousItem();
        } else if (a > (Math.PI*3)/4 || a < -(Mth.PI*3)/4) {
          // left swipe
          this.nextItem();
        }
      }
    }
  }

  events.on(window, "touchstart", this.onTouchStart, this);
  events.on(window, "touchmove", this.onTouchMove, this);
  events.on(window, "touchend", this.onTouchEnd, this);

  this.bind = (binding, callback) => {
    mousetrap.bind(binding, callback.bind(this));
  };

  this.bind(["pageup", "left"], this.previousItem);
  this.bind(["pagedown", "right"], this.nextItem);

  setTimeout(() => {
    this.rescale();

    let match = /^#(\d+)$/.exec(window.location.hash);
    if (match) {
      this.activateItem(parseInt(match[1], 10));
    } else {
      this.nextItem();
    }
  }, 1);

}

module.exports = Deck;
