function minIndent(text) {
  return text.split("\n").reduce(function(min, line) {
    if (line.trim().length === 0) return min;
    var indent = line.length - line.trimLeft().length;
    return min === null ? indent : Math.min(min, indent);
  }, null);
}

function alignIndents(text) {
  var indent = minIndent(text);
  return text.split("\n").map(function(line) {
    return line.slice(indent).trimRight();
  }).join("\n");
}

function cleanText(text, type) {
  text = alignIndents(text);
  while (text[0] === "\n") text = text.slice(1);
  while (text[text.length-1] === "\n") text = text.slice(0, text.length - 1);
  if (type === "html") {
    text = text.replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&");
  }
  return text + "\n";
}

function splitLines(text, lines) {
  if (lines.length === 0) return [text];

  let line = lines.slice(-1)[0];
  let nextLines = lines.slice(0, -1);

  let t = text.split("\n");
  let before = t.slice(0, line);
  let after = t.slice(line);

  return splitLines(before.join("\n") + "\n", nextLines).concat([after.join("\n")]);
}

function filterLines(text, re) {
  let lines = text.split("\n");
  return lines.filter((line) => !re.test(line)).join("\n");
}

module.exports = { cleanText: cleanText,
                   splitLines: splitLines,
                   filterLines: filterLines };
