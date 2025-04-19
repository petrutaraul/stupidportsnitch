const fs = require("fs");
const path = require("path");
const https = require("https");

const pluginUrl =
  "https://raw.githubusercontent.com/electron-userland/electron-builder/master/packages/electron-builder/src/templates/nsis/nsis-download-plugin.nsh";
const pluginPath = path.join(__dirname, "nsis-download-plugin.nsh");

console.log("Downloading NSIS download plugin...");

https
  .get(pluginUrl, (response) => {
    const file = fs.createWriteStream(pluginPath);
    response.pipe(file);

    file.on("finish", () => {
      file.close();
      console.log("NSIS download plugin installed successfully");
    });
  })
  .on("error", (err) => {
    console.error("Error downloading NSIS plugin:", err.message);
  });
