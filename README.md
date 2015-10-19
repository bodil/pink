# Pink

Pink is a tool for writing and running HTML based slide decks.

## Installation

Pink can be installed via [npm](http://npmjs.org/):

```sh
$ npm install -g pink
```

## Getting Started

```sh
$ mkdir ohai-presentation
$ cd ohai-presentation
$ pink init
```

The above gives you a template project, containing the following:

* A Javascript configuration file, normally `slides.js`. This file is
  responsible for running your slide deck, and it's where you can add
  functionality to your slides through modules, and load CSS themes.
* The `index.html` file, which is where your actual slides go.

## Running Your Presentation

You can launch your slides as a web server using this command launched
from your presentation directory:

```sh
$ pink run
```

Using the template project, this should get you a single slide
containing the words "OMG SLIDES."

## Navigating the Slide Deck

The following keybindings allow you to navigate the slides:

* `PageUp`/`Left` - navigate backwards
* `PageDown`/`Right` - navigate forwards
* `F9` - toggle dual screen mode

If you're on a device with a touchscreen, you can also navigate backwards and forwards by swiping horizontally.

## How To Slide

Looking at the `index.html` file, you'll notice that there's not much in it apart from the HTML header, a script tag which loads Pink, and a `<div id="slides">` containing a single `<section>`. Every `<section>` represents one single slide. Sections can't be nested—Pink slide decks have only one dimension.

Inside a `<section>` block, you'll describe a slide using HTML. Pink is designed to be accommodating about what consititutes a slide, but usually you'll have one or a combination of a header, a paragraph of text, a bullet list, or just an image.

```html
<section>
  <h3>How Do I Shot Web</h3>
  <p>hello internets, can u pls halp how do i shot web</p>
  <ul>
    <li>engage web shoter</li>
    <li>double click on shot button</li>
  </ul>
</section>
```

## Fragments

A Pink slide deck is physically organised as a sequence of slides, but it's more correct to think of one as a sequence of *fragments*. There's nothing worse than a slide throwing several minutes worth of exposition in your face in one go, so usually you want to split it up into parts which will appear gradually as you advance through the presentation.

```html
<section>
  <ul>
    <li>hello this is my first point</li>
    <li class="fragment">this point appears when I ask for the next slide</li>
    <li class="fragment">and this appears as the next next slide</li>
    <li class="fragment">and this is the next next next slide</li>
  </ul>
</section>
```

The above example is all a single slide, but it's actually four distinct events as you page through your presentation. First, the slide appears containing only the first bullet point. Navigate forward, and instead of a new slide the second bullet point will appear, and so on until you have four bullet points on screen. Only then will navigating forward advance to the next slide. Of course, navigating backwards through the presentation will remove each fragment in turn until you get to the slide's initial state, then move to the previous slide.

## Themes

Themes are simply CSS files modifying the appearance of your HTML slides. To load one of Pink's bundled themes, add the following line to the start of your `slides.js` file:

```js
require("pink/css/themes/dijkstra.less");
```

This will load the specified CSS (or, in this case, a LESS file which will be converted to CSS) and apply it to your HTML document.

Pink uses Webpack to assemble the presentation code. The `require` function in the example above is like the CommonJS `require`, except it can load anything Pink's Webpack configuration supports. This includes CSS and LESS.

If you've got your own local CSS file, you might thus load it using something like this:

```js
require("./my-css/style.css");
```

Or you could even load one from an external package:

```js
require("very-good-theme/theme.less");
```

This would attempt to load the file `node_modules/very-good-theme/theme.less` relative to your project directory. Pink will search for modules just like you'd expect from Node, as well as inside the global Pink module. Loading the `dijkstra.less` theme above was an example of the latter.

Naturally, you can add a `package.json` file to set up dependencies to be installed. It's not required by Pink, but it's the recommended way to deal with dependencies for your slide deck.

## Modules

You can add functionality to Pink through its module system. Modules are normally enabled on a per-slide basis, and the set of modules to use is configured in the Pink constructor.

In addition to `require` functions loading themes and Pink itself, the `slides.js` file contains a constructor `new Pink(...);`, which takes as its first argument a DOM element or CSS selector describing where to install Pink in your document, and a list of modules to load represented by a map from module name to module content.

You get the two most basic modules by default with the template:

```js
new Pink("#slides", {
  "background": require("pink/modules/background"),
  "image": require("pink/modules/image")
});
```

The `background` module lets you add slide specific backgrounds by adding a `data-background` attribute to the slide's `section` tag. Likewise, the `image` module supports a `data-image` attribute on the `section` tag which sets the background of the slide area, as opposed to the area behind the slide.

The `data-background` attribute corresponds directly to the `"background"` key on the object you pass to the constructor. You could change it to something else if you like; the `background` module has no other relationship to it. Pink simply looks at each `section` tag, and if it has a data attribute corresponding to a module as defined in the constructor, it enabled the module for that slide and passes the contents of the data attribute as an argument.

If you want a module to be active on every slide, set the data attribute on the container element (the element you pass as the constructor's first argument). The value of this data attribute can be overridden on each section, so if you set `data-background="doge.png"` on the parent element, `doge.png` will be the background for all slides without a `data-background` attribute, but a `section` tag with `data-background="catte.png"` would instead have `catte.png` as its background.

Some modules may observe other data attributes as well, but they do so by their own mechanisms.

## Building Presentations

As well as the `pink run` command to launch a local web server, there's the `pink build` command, which will build the required assets for your presentation to be run as a static web page. Simply run `pink build slides.js`, and the `dist` directory inside your project will be populated with the necessary assets. You can deploy this along with the `index.html` file and whatever other assets you may have added (such as an image directory, maybe) to a static web server anywhere you like.

## Module Index

Pink comes with the following modules bundled:

### `background`

The `background` module lets you specify an image to be displayed behind a slide. It will be automatically scaled to fill the available space completely.

### `image`

The `image` module lets you set a background image for the slide's body. This is primarily useful for slides meant to only show an image, with perhaps a caption overlaid on it.

### `editor`

This is Pink's embedded code editor, intended for live coding presentations. It's nowhere close to stable at the moment, nor is its API. It'll be documented when it is.

## License

Copyright 2014 Bodil Stokke

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see
[http://www.gnu.org/licenses/](http://www.gnu.org/licenses/).
