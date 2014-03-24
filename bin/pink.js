#!/usr/bin/env node

var yargs = require("yargs");
var path = require("path");
var webpack = require("webpack");
var ansi = require("ansi");
var seq = require("../lib/seq");

var stdout = ansi(process.stdout);
var stderr = ansi(process.stderr);

var usage = "Usage: $0 <command>\n\n" +
      "Commands:\n\n" +
      "  init <path>   Install a project template in the given (or current) directory\n" +
      "  run <file>    Launch a web server running Pink with the given JS module file\n" +
      "  build <file>  Build deployable assets from the given JS module file";

var argv = yargs.usage(usage)

      .default("host", "localhost").alias("host", "h").string("host")
      .describe("host", "IP address to bind web server to")

      .default("port", 1337).alias("port", "p")
      .describe("port", "web server TCP port")

      .boolean("mono").alias("mono", "m")
      .describe("mono", "don't use colours in Webpack messages")

      .boolean("help").alias("help", "h")
      .describe("help", "display this help message")

      .argv;

if (argv.help) {
  yargs.showHelp();
  process.exit(0);
}

var command = argv._[0];
if (!command) {
  stderr.write("Missing command.\n"),
  yargs.showHelp();
  process.exit(1);
}

function getPresentationFile() {
  var presentationFile = argv._[1];
  if (!presentationFile) {
    stderr.write("Missing presentation file.\n"),
    yargs.showHelp();
    process.exit(1);
  } else {
    presentationFile = path.resolve(process.cwd(), presentationFile);
  }

  return presentationFile;
}

var OccurenceOrderPlugin = require("webpack/lib/optimize/OccurenceOrderPlugin");
var DedupePlugin = require("webpack/lib/optimize/DedupePlugin");
var UglifyPlugin = require("webpack/lib/optimize/UglifyJsPlugin");

var webpackConfig = {
  bail: true,
  cache: true,
  context: process.cwd(),
  output: {
    path: path.join(process.cwd(), "dist/pink"),
    filename: "pink.js",
    publicPath: "dist/pink/"
  },
  module: {
    loaders: [
      { test: /\.less$/, loader: "style!css!less" },
      { test: /\.css$/, loader: "style!css" },
      { test: /\.json$/, loader: "json" },
      { test: /\.png$/, loader: "url?limit=10000&mimetype=image/png" },
      { test: /\.svg$/, loader: "url?limit=10000&mimetype=image/svg" },
      { test: /\.otf$/, loader: "url?limit=10000&mimetype=application/x-font-otf" },
      { test: /\.ttf$/, loader: "url?limit=10000&mimetype=application/x-font-ttf" },
      { test: /\.mp3$/, loader: "url?limit=10000&mimetype=audio/mpeg" },
      { test: /\.html$/, loader: "url?limit=10000&mimetype=text/html" },
      { test: /\.es6$/, loader: require("path").join(__dirname, "..", "es6-loader.js") }
    ]
  },
  devtool: "source-map",
  resolve: {
    extensions: ["", ".es6", ".js"],
    alias: {
      "pink": path.join(__dirname, "..")
    }
  },
  resolveLoader: {
    fallback: [path.join(__dirname, "..", "node_modules")]
  },
  node: {
    "global": true,
    "process": true,
    "__filename": true,
    "__dirname": true
  },
  plugins: [
    new OccurenceOrderPlugin(),
    new DedupePlugin(),
    new UglifyPlugin()
  ]
};

function buildPresentation() {
  var compiler = webpack(seq.merge(webpackConfig, {
    entry: getPresentationFile()
  }));
  compiler.run(function(err, stats) {
    if (err) {
      stderr.red().bold().write("ERROR: ")
        .reset().write(err.message)
        .write("\n")
        .write(err.details)
        .write("\n");
      process.exit(1);
    } else {
      stdout.write(stats.toString({ colors: !argv.mono }));
    }
  });
}

function runServer() {
  var WebpackDevServer = require("webpack-dev-server");
  var compiler = webpack(seq.merge(webpackConfig, {
    entry: getPresentationFile(),
    plugins: []
  }));
  var server = new WebpackDevServer(compiler, {
    publicPath: "/dist/pink/",
    stats: {
      hash: false,
      assets: false,
      chunks: false,
      colors: !argv.mono
    }
  });
  server.listen(argv.port, argv.host, function() {
    stdout.write("Development server running: ")
      .yellow().bold().write("http://" + argv.host + ":" + argv.port)
      .reset().write("\n");
  });
}

function installTemplate() {
  var copy = require("directory-copy");
  var mkdirp = require("mkdirp");

  var dest = path.resolve(process.cwd(), argv._[1] || ".");
  mkdirp.sync(dest);
  copy({
    src: path.join(__dirname, "..", "template"),
    dest: dest
  }, function(err) {
    if (err) {
      stderr.red().bold().write("ERROR: ").reset().write(require("util").inspect(err)).write("\n");
    } else {
      stdout.write("Installed project template: ")
        .green().write(dest).reset().write("\n");
    }
  });
}

var commands = {
  "build": buildPresentation,
  "run": runServer,
  "init": installTemplate
};

if (!commands[command]) {
  console.error("Unknown command \'" + command + "\'.");
  process.exit(1);
} else {
  commands[command]();
}
