const fs = require("fs");
const path = require("path");

const filesToCopy = [
  { src: "manifest.json", dest: "dist/manifest.json" },
  { src: "src/popup/popup.html", dest: "dist/popup/popup.html" },
  { src: "src/popup/popup.css", dest: "dist/popup/popup.css" },
  { src: "icons", dest: "dist/icons" }
];

// make directories & copy
filesToCopy.forEach(f => {
  const destDir = path.dirname(f.dest);
  fs.mkdirSync(destDir, { recursive: true });
  if (fs.lstatSync(f.src).isDirectory()) {
    // copy directory
    fs.cpSync(f.src, f.dest, { recursive: true });
  } else {
    fs.copyFileSync(f.src, f.dest);
  }
});