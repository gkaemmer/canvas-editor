// https://github.com/Ahrengot/Monokai-theme-for-Prism.js
import memoize from "lodash/memoize";

const defaultText = "#76d9e6";
const background = "#2a2a2a";

const colors = [
  [["comment", "prolog", "doctype", "cdata"], "#6f705e"],
  [["null", "operator", "boolean", "number"], "#bebec5"],
  [["attr-name", "string", "entity", "url"], "#e6d06c"],
  [["selector"], "#a6e22d"],
  [["atrule", "attr-value", "control", "keyword", "directive", "important", "unit"], "#f13374"],
  [["function"], "#a1df02"],
  [["regex", "statement"], "#76d9e6"],
  [["placeholder", "variable"], "#ffffff"],
  [["punctuation"], "#bebec5"]
];

const bolds = ["important", "statement", "bold"];
const italics = [];

const styles = {};

for (let [elements, color] of colors) {
  for (let element of elements) {
    styles[element] = [color];
  }
}

for (let element in styles) {
  styles[element].push(bolds.includes(element));
}

for (let element in styles) {
  styles[element].push(italics.includes(element));
}

let cache = {};

export default {
  background,
  text: elementType => {
    if (cache[elementType]) return cache[elementType];

    const elementTypes = elementType.split();
    let finalColor = defaultText;
    let finalBold = false;
    let finalItalic = false;

    for (let elementType of elementTypes) {
      if (styles[elementType]) {
        const [color, bold, italic] = styles[elementType];
        if (bold) finalBold = true;
        if (italic) finalItalic = true;
        finalColor = color;
      }
    }
    const result = [finalColor, finalBold, finalItalic];
    cache[elementType] = result;
    return result;
  }
};
