/* global document, window, setTimeout, Element */

// Load the Babel polyfill first of all.
import "babel-polyfill";

import "./css/screen.less";

import mousetrap from "./lib/mousetrap";
import events from "./lib/events";
import seq from "./lib/seq";
import {EventEmitter} from "events";

function applyDataAttrs(el, data) {
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      el.setAttribute(`data-${key}`, data[key]);
    }
  }
}

function isFragment(node) {
  return node.classList.contains("fragment");
}

function fragmentSlide(startNode) {
  let node = startNode;
  if (isFragment(node)) {
    while (node.nodeName !== "SECTION") {
      node = node.parentNode;
    }
  }
  return node;
}

class BasicDeck extends EventEmitter {
  constructor(containerIn, deckModules) {
    super();

    const container = typeof containerIn === "string" ? document.querySelector(containerIn) : containerIn;
    container.classList.add("slides");

    this.deckModules = deckModules;
    this.container = container;
    this.slideData = container.innerHTML;
    this.dataset = seq.merge(container.dataset);

    const slides = seq.toArray(container.querySelectorAll("section"));
    this.slides = slides;
    this.currentSlide = null;
    this.currentItem = null;

    this.stream = seq.flatMap((slide) => {
      return [slide].concat(seq.toArray(slide.querySelectorAll(".fragment")));
    }, slides);

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

    events.on(window, "resize", this.rescale, this);

    slides.forEach(((slide) => this.initModules(slide)).bind(this));

    events.on(container, events.vendorPrefix("TransitionEnd"), this.transitionEnd, this);
  }

  deactivateSlide = (slide) => {
    if (slide.classList.contains("current")) {
      slide.classList.add("out");
      slide.classList.remove("current");
    }
    this.currentSlide = null;
  }

  activateSlide = (slide) => {
    if (slide.classList.contains("out")) {
      this.cleanupModules(slide);
      slide.classList.remove("out");
    }
    if (this.currentSlide !== null) {
      this.deactivateSlide(this.currentSlide);
    }
    this.currentSlide = slide;

    this.activateModules(slide);

    slide.classList.add("current");
    slide.classList.add("in");
  }

  activateItem = (item) => {
    function applyFragment(stream, from, to, f) {
      for (let i = from; i <= to; i++) {
        const node = stream[i];
        if (isFragment(node)) {
          f(node);
        }
      }
    }

    if (item >= this.stream.length) {
      throw new ReferenceError(`deck has ${this.stream.length} items but ${item} requested`);
    }
    const itemSlide = fragmentSlide(this.stream[item]);
    if (this.currentItem !== null) {
      if (this.currentItem < item) {
        applyFragment(this.stream, this.currentItem, item,
                      (node) => node.classList.add("active"));
      } else if (this.currentItem > item) {
        applyFragment(this.stream, item + 1, this.currentItem,
                      (node) => node.classList.remove("active"));
      }
    } else {
      applyFragment(this.stream, 0, item, (node) => node.classList.add("active"));
      applyFragment(this.stream, item + 1, this.stream.length - 1,
                    (node) => node.classList.remove("active"));
    }
    this.currentItem = item;
    if (this.currentSlide !== itemSlide) {
      this.activateSlide(itemSlide);
      this.emit("slide", this.currentSlide);
    }
    this.emit("item", this.currentItem);
  }

  nextItem = () => {
    let nextItem = this.currentItem !== null ? this.currentItem + 1 : 0;
    if (nextItem >= this.stream.length) {
      nextItem = this.stream.length - 1;
    }
    if (nextItem !== this.currentItem) {
      this.activateItem(nextItem);
    }
  }

  previousItem = () => {
    let prevItem = this.currentItem !== null ? this.currentItem - 1 : 0;
    if (prevItem < 0) {
      prevItem = 0;
    }
    if (prevItem !== this.currentItem) {
      this.activateItem(prevItem);
    }
  }

  initModules = (slide) => {
    const slideData = slide.dataset;
    const deckData = this.container.dataset;
    const mods = [];
    for (const mod in this.deckModules) {
      if (this.deckModules.hasOwnProperty(mod)) {
        const arg = slideData.hasOwnProperty(mod) ? slideData[mod]
                  : deckData.hasOwnProperty(mod) ? deckData[mod] : null;
        if (arg) {
          mods.push(new this.deckModules[mod](slide, arg));
        }
      }
    }
    slide.deckModules = mods; // eslint-disable-line no-param-reassign
  }

  activateModules = (slide) => {
    slide.deckModules.forEach((mod) => mod.activate && mod.activate());
  }

  stabiliseModules = (slide) => {
    slide.deckModules.forEach((mod) => mod.stabilise && mod.stabilise());
  }

  cleanupModules = (slide) => {
    slide.deckModules.forEach((mod) => mod.cleanup && mod.cleanup());
  }

  transitionEnd = (e) => {
    const slide = e.target;
    if (slide.classList.contains("out")) {
      slide.classList.remove("out");
      this.cleanupModules(slide);
    } else if (slide.classList.contains("in")) {
      slide.classList.remove("in");
      this.stabiliseModules(slide);
    }
  }

  rescale = () => {
    const screenw = window.innerWidth;
    const screenh = window.innerHeight;

    const targetw = 1280;
    const targeth = 720;

    const targetScale = Math.min(screenw / targetw, screenh / targeth);

    this.container.style.zoom = targetScale;
  }

  cleanup = () => {
    this.slides.forEach(((slide) => this.cleanupModules(slide)).bind(this));
    events.off(window, "resize", this.rescale);
    events.off(this.container, events.vendorPrefix("TransitionEnd"), this.transitionEnd);
  }
}

class Deck extends BasicDeck {
  constructor(container, deckModules) {
    super(container, deckModules);

    events.on(window, "touchstart", this.onTouchStart, this);
    events.on(window, "touchmove", this.onTouchMove, this);
    events.on(window, "touchend", this.onTouchEnd, this);
    events.on(window, "message", this.onMessage);

    this.bind(["pageup", "left"], this.previousItem);
    this.bind(["pagedown", "right"], this.nextItem);
    this.bind(["f9"], this.toggleCheatMode);
    this.bind(["f4"], this.toggleFullscreen);

    this.on("item", (i) => {
      window.location.hash = `${i}`;
      this.syncAux();
    });

    window.onbeforeunload = () =>
      "Here is a confirmation dialog in case you just hit Ctrl-W because of Emacs muscle memory as usual.";

    setTimeout(() => {
      this.rescale();

      const match = /^#(\d+)$/.exec(window.location.hash);
      if (match) {
        this.activateItem(parseInt(match[1], 10));
      } else {
        this.nextItem();
      }
    }, 1);
  }

  onTouchStart = (e) => {
    this.touching = e.touches.length ? {
      sx: e.touches[0].screenX, sy: e.touches[0].screenY
    } : null;
  }

  onTouchMove = (e) => {
    this.touching = e.touches.length ? {
      sx: this.touching.sx, sy: this.touching.sy,
      ex: e.touches[0].screenX, ey: e.touches[0].screenY
    } : null;
  }

  onTouchEnd = () => {
    if (this.touching) {
      const x = this.touching.ex - this.touching.sx;
      const y = this.touching.ey - this.touching.sy;
      const r = Math.sqrt(x * x + y * y);
      const a = Math.atan2(y, x);
      this.touching = null;
      if (r > 20) {
        if (a > -Math.PI / 4 && a < Math.PI / 4) {
          // right swipe
          this.previousItem();
        } else if (a > Math.PI * 3 / 4 || a < -(Math.PI * 3) / 4) {
          // left swipe
          this.nextItem();
        }
      }
    }
  }

  toggleCheatMode = () => {
    if (document.body.classList.contains("cheatmode")) {
      this.cleanupCheatMode();
    } else {
      this.initCheatMode();
    }
  }

  initCheatMode = () => {
    document.body.classList.add("cheatmode");
    this.container.classList.add("primary");

    this.secondaryElement = document.createElement("div");
    this.secondaryElement.classList.add("slides");
    this.secondaryElement.classList.add("secondary");
    applyDataAttrs(this.secondaryElement, this.dataset);
    this.secondaryElement.innerHTML = this.slideData + endSlide;
    this.container.parentNode.appendChild(this.secondaryElement);
    this.secondary = new BasicDeck(this.secondaryElement, this.deckModules);
    this.secondary.rescale();

    this.external = window.open(window.location.href, "pink-secondary-screen", "dialog=1");

    this.syncAux();
  }

  cleanupCheatMode = () => {
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
  }

  syncAux = () => {
    if (this.secondary) {
      this.secondary.activateItem(this.currentItem + 1);
    }
    if (this.external) {
      this.external.postMessage({item: this.currentItem}, window.location.origin);
    }
  }

  onMessage = (e) => {
    if (e.origin == window.location.origin) {
      if (e.data.item !== undefined) {
        this.activateItem(e.data.item);
      }
    }
  }

  toggleFullscreen = () => {
    // const el = document.getElementById("slides");
    const el = document.body;

    if (!document.fullscreenElement
        && !document.mozFullScreenElement
        && !document.webkitFullscreenElement
        && !document.msFullscreenElement) {
      if (el.requestFullscreen) {
        el.requestFullscreen();
      } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
      } else if (el.mozRequestFullScreen) {
        el.mozRequestFullScreen();
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }

  bind = (binding, callback) => {
    mousetrap.bind(binding, callback.bind(this));
  }
}

const endSlide = `<section style="color: white; background: black; text-align: center"><p style="font-size: 64pt; text-decoration: none; font-weight: bold; font-family: sans-serif">LAST SLIDE</p></section>`;

module.exports = Deck;
