/*global setTimeout */

// Load the Babel polyfill first of all.
require("babel-core/browser-polyfill");

require("./css/screen.less");

var mousetrap = require("./lib/mousetrap");
var hammer = require("hammerjs");
var events = require("./lib/events");
var seq = require("./lib/seq");
var EventEmitter = require("events").EventEmitter;
var util = require("util");

function applyDataAttrs(el, data) {
  for (let key in data) {
    if (data.hasOwnProperty(key)) {
      el.setAttribute("data-" + key, data[key]);
    }
  }
}

function BasicDeck(container, deckModules) {
  EventEmitter.call(this);

  if (typeof container === "string") {
    container = document.querySelector(container);
  }
  container.classList.add("slides");

  this.container = container;
  this.slideData = container.innerHTML;
  this.dataset = seq.merge(container.dataset);

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
  };

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
  };

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
    if (item >= stream.length) {
      throw new ReferenceError("deck has " + stream.length + " items but " +
                               item + " requested");
    }
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
      this.emit("slide", this.currentSlide);
    }
    this.emit("item", this.currentItem);
  };

  this.nextItem = () => {
    let nextItem = this.currentItem !== null ? this.currentItem + 1 : 0;
    if (nextItem >= stream.length) nextItem = stream.length - 1;
    if (nextItem !== this.currentItem) this.activateItem(nextItem);
  };

  this.previousItem = () => {
    let prevItem = this.currentItem !== null ? this.currentItem - 1 : 0;
    if (prevItem < 0) prevItem = 0;
    if (prevItem !== this.currentItem) this.activateItem(prevItem);
  };

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
  };

  this.activateModules = (slide) => {
    slide._deck_modules.forEach((mod) => mod.activate && mod.activate());
  };

  this.stabiliseModules = (slide) => {
    slide._deck_modules.forEach((mod) => mod.stabilise && mod.stabilise());
  };

  this.cleanupModules = (slide) => {
    slide._deck_modules.forEach((mod) => mod.cleanup && mod.cleanup());
  };

  this.transitionEnd = (e) => {
    let slide = e.target;
    if (slide.classList.contains("out")) {
      slide.classList.remove("out");
      this.cleanupModules(slide);
    } else if (slide.classList.contains("in")) {
      slide.classList.remove("in");
      this.stabiliseModules(slide);
    }
  };

  this.rescale = () => {
    const screenw = window.innerWidth,
          screenh = window.innerHeight;

    const targetw = 1280,
          targeth = 720;

    const targetScale = Math.min(screenw / targetw, screenh / targeth);

    this.container.style.zoom = targetScale;
  };

  events.on(window, "resize", this.rescale, this);

  slides.forEach(((slide) => this.initModules(slide)).bind(this));

  events.on(container, events.vendorPrefix("TransitionEnd"), this.transitionEnd, this);

  this.cleanup = () => {
    slides.forEach(((slide) => this.cleanupModules(slide)).bind(this));
    events.off(window, "resize", this.rescale);
    events.off(container, events.vendorPrefix("TransitionEnd"), this.transitionEnd);
  };
}
util.inherits(BasicDeck, EventEmitter);

function Deck(container, deckModules) {
  BasicDeck.apply(this, arguments);

  this.onTouchStart = (e) => {
    this.touching = e.touches.length ? {
      sx: e.touches[0].screenX, sy: e.touches[0].screenY
    } : null;
  };

  this.onTouchMove = (e) => {
    this.touching = e.touches.length ? {
      sx: this.touching.sx, sy: this.touching.sy,
      ex: e.touches[0].screenX, ey: e.touches[0].screenY
    } : null;
  };

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
        } else if (a > (Math.PI*3)/4 || a < -(Math.PI*3)/4) {
          // left swipe
          this.nextItem();
        }
      }
    }
  };

  events.on(window, "touchstart", this.onTouchStart, this);
  events.on(window, "touchmove", this.onTouchMove, this);
  events.on(window, "touchend", this.onTouchEnd, this);

  this.toggleCheatMode = () => {
    if (document.body.classList.contains("cheatmode")) {
      this.cleanupCheatMode();
    } else {
      this.initCheatMode();
    }
  };

  this.initCheatMode = () => {
    document.body.classList.add("cheatmode");
    this.container.classList.add("primary");

    this.secondaryElement = document.createElement("div");
    this.secondaryElement.classList.add("slides");
    this.secondaryElement.classList.add("secondary");
    applyDataAttrs(this.secondaryElement, this.dataset);
    this.secondaryElement.innerHTML = this.slideData + endSlide;
    this.container.parentNode.appendChild(this.secondaryElement);
    this.secondary = new BasicDeck(this.secondaryElement, deckModules);
    this.secondary.rescale();

    this.external = window.open(window.location.href, "pink-secondary-screen", "dialog=1");

    this.syncAux();
  };

  this.cleanupCheatMode = () => {
    if (this.external) {
      this.external.close();
      this.external = null;
    }
    if (this.secondary) {
      this.secondary.cleanup();
      this.secondary = null;
    }
    if (this.secondaryElement) {
      this.secondaryElement.parentNode.removeChild(this.secondaryElement);
      this.secondaryElement = null;
    }
    this.container.classList.remove("primary");
    document.body.classList.remove("cheatmode");
  };

  this.syncAux = () => {
    if (this.secondary) {
      this.secondary.activateItem(this.currentItem + 1);
    }
    if (this.external) {
      this.external.postMessage({ item: this.currentItem }, window.location.origin);
    }
  };

  this.onMessage = (e) => {
    if (e.origin == window.location.origin) {
      if (e.data.item !== undefined) {
        this.activateItem(e.data.item);
      }
    }
  };

  this.bind = (binding, callback) => {
    mousetrap.bind(binding, callback.bind(this));
  };

  this.bind(["pageup", "left"], this.previousItem);
  this.bind(["pagedown", "right"], this.nextItem);
  this.bind(["f9"], this.toggleCheatMode);

  this.on("item", (i) => {
    window.location.hash = "" + i;
    this.syncAux();
  });

  events.on(window, "message", this.onMessage);

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
util.inherits(Deck, BasicDeck);

const endSlide = '<section style="color: white; background: black; text-align: center"><p style="font-size: 64pt; text-decoration: none; font-weight: bold; font-family: sans-serif">LAST SLIDE</p></section>';

module.exports = Deck;
