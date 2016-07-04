#!/usr/bin/env node

var path = require("path");
var modPath = path.resolve(__dirname, "..", "node_modules");
require("app-module-path").addPath(modPath);

var fs = require("fs");
var minimist = require("minimist");
var chalk = require("chalk");
var webpack = require("webpack");
var ansi = require("ansi");
var seq = require("../lib/seq");

var stdout = process.stdout;
var stderr = process.stderr;

var argv = minimist(process.argv.slice(2), {
  string: ["host"],
  boolean: ["mono", "help"],
  alias: {
    h: "host",
    p: "port",
    m: "mono"
  },
  default: {
    host: "localhost",
    port: 1337
  }
});

var usage = "Usage: pink <command>\n\n" +
    "Commands:\n\n" +
    "  init <path>   Install a project template in the given (or current) directory\n" +
    "  run <file>    Launch a web server running Pink with the given JS module file\n" +
    "  build <file>  Build deployable assets from the given JS module file\n\n" +
    "Options:\n\n" +
    "  -h --host <address>  IP address to bind web server to\n" +
    "  -p --port <port>     web server TCP port\n" +
    "  -m --mono            don't use ANSI colours\n\n";

function help(v) {
  console.error(usage);
  process.exit(v || 0);
}

if (argv.help) {
  help(0);
}

if (argv.mono) {
  chalk.enabled = false;
}

var command = argv._[0];
if (!command) {
  stderr.write("Missing command.\n"),
  help(1);
}

function getPresentationFile() {
  var presentationFile = argv._[1];
  if (!presentationFile) {
    stderr.write("Missing presentation file.\n"),
    help(1);
  } else {
    presentationFile = path.resolve(process.cwd(), presentationFile);
  }

  return presentationFile;
}

function webpackConfig() {
  var presentation = getPresentationFile();
  var presentationPath = path.dirname(presentation);
  return {
    bail: true,
    cache: true,
    context: presentationPath,
    entry: {
      pink: presentation
    },
    output: {
      path: path.join(presentationPath, "dist/pink"),
      filename: "[name].js",
      publicPath: "dist/pink/"
    },
    module: {
      preLoaders: [
        { test: /\.js$/, loader: "babel-loader",
          exclude: [
              /.*\/node_modules\/.*/
          ],
          query: JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", ".babelrc"), "utf8"))
        }
      ],
      loaders: [
        { test: /\.less$/, loader: "style!css!less" },
        { test: /\.css$/, loader: "style!css" },
        { test: /\.json$/, loader: "json" },
        { test: /\.png$/, loader: "url?limit=10000&mimetype=image/png" },
        { test: /\.svg$/, loader: "url?limit=10000&mimetype=image/svg" },
        { test: /\.otf$/, loader: "url?limit=10000&mimetype=application/x-font-otf" },
        { test: /\.ttf$/, loader: "url?limit=10000&mimetype=application/x-font-ttf" },
        { test: /\.woff$/, loader: "url?limit=10000&mimetype=application/x-font-woff" },
        { test: /\.eot$/, loader: "url?limit=10000&mimetype=application/x-font-eot" },
        { test: /\.mp3$/, loader: "url?limit=10000&mimetype=audio/mpeg" },
        { test: /\.html$/, loader: "url?limit=10000&mimetype=text/html" }
      ]
    },
    devtool: "source-map",
    resolve: {
      extensions: ["", ".js", ".json"],
      alias: {
        "pink": path.join(__dirname, "..")
      }
    },
    resolveLoader: {
      fallback: [modPath]
    },
    node: {
      "global": true,
      "process": true,
      "__filename": true,
      "__dirname": true,
      "setImmediate": true
    }
  };
};

function buildPresentation() {
  var compiler = webpack(webpackConfig());
  compiler.run(function(err, stats) {
    if (err) {
      stderr.write(chalk.red.bold("ERROR: "));
      stderr.write(err.message + "\n" + err.details + "\n");
      process.exit(1);
    } else {
      stdout.write(stats.toString({ colors: !argv.mono }));
    }
  });
}

function runServer() {
  var WebpackDevServer = require("webpack-dev-server");
  var config = webpackConfig();
  var compiler = webpack(config);
  var server = new WebpackDevServer(compiler, {
    contentBase: config.context,
    publicPath: "/dist/pink/",
    stats: {
      hash: false,
      assets: false,
      chunks: false,
      colors: !argv.mono
    }
  });
  server.listen(argv.port, argv.host, function() {
    stdout.write("Development server running: ");
    stdout.write(chalk.yellow.bold("http://" + argv.host + ":" + argv.port));
    stdout.write("\n");
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
      stderr.write(chalk.red.bold("ERROR: "));
      stderr.write(require("util").inspect(err));
      stderr.write("\n");
    } else {
      stdout.write("Installed project template: ");
      stdout.write(chalk.green(dest));
      stdout.write("\n");
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
