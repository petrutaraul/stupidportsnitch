/**
 * This script removes unnecessary files from the final package
 * to reduce the app size based on Electron's performance recommendations
 */
const fs = require("fs");
const path = require("path");

/**
 * Recursively delete files matching patterns or in specific directories
 * @param {string} dir Directory to clean
 * @param {Array<string|RegExp>} patterns Patterns of files to remove
 * @param {Array<string>} foldersToSkip Folders to skip entirely (don't cleanup)
 */
function cleanDirectory(dir, patterns = [], foldersToSkip = []) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip specified folders
      if (foldersToSkip.includes(entry.name)) {
        continue;
      }

      // Otherwise recurse into directory
      cleanDirectory(fullPath, patterns, foldersToSkip);
      continue;
    }

    // Check if file matches any pattern for removal
    if (
      patterns.some((pattern) =>
        pattern instanceof RegExp
          ? pattern.test(entry.name)
          : entry.name === pattern
      )
    ) {
      console.log(`Removing file: ${fullPath}`);
      fs.unlinkSync(fullPath);
    }
  }
}

/**
 * Main function to reduce app size after packaging
 * This is the handler function that electron-builder will call
 */
module.exports = async function (context) {
  const { appOutDir, packager } = context;
  const platform = packager.platform.name;

  console.log(`Optimizing package size for platform: ${platform}`);

  // Files to remove on all platforms
  const filesToRemove = [/\.DS_Store$/, /Thumbs\.db$/, /desktop\.ini$/];

  // Folders we should skip (don't cleanup)
  const foldersToSkip = [
    "node_modules",
    "resources/nmap", // Skip nmap resources which are needed
  ];

  // Platform-specific cleanup
  if (platform === "mac") {
    // Process macOS app bundle
    const appBundle = path.join(
      appOutDir,
      `${packager.appInfo.productName}.app`
    );
    if (fs.existsSync(appBundle)) {
      const resourcesPath = path.join(appBundle, "Contents", "Resources");

      // Clean up locales - keep only English
      const localesPath = path.join(resourcesPath, "locales");
      if (fs.existsSync(localesPath)) {
        const localesToKeep = ["en-US.pak", "en-GB.pak"];
        const locales = fs.readdirSync(localesPath);

        for (const locale of locales) {
          if (!localesToKeep.includes(locale)) {
            const localePath = path.join(localesPath, locale);
            console.log(`Removing locale: ${localePath}`);
            fs.unlinkSync(localePath);
          }
        }
      }

      // Remove unnecessary Chromium files
      const filesToRemoveMac = [
        ...filesToRemove,
        "LICENSES.chromium.html", // We can remove this large license file
      ];

      cleanDirectory(resourcesPath, filesToRemoveMac, foldersToSkip);
    }
  } else if (platform === "win") {
    // Clean up locales - keep only English
    const localesPath = path.join(appOutDir, "locales");
    if (fs.existsSync(localesPath)) {
      const localesToKeep = ["en-US.pak", "en-GB.pak"];
      const locales = fs.readdirSync(localesPath);

      for (const locale of locales) {
        if (!localesToKeep.includes(locale)) {
          const localePath = path.join(localesPath, locale);
          console.log(`Removing locale: ${localePath}`);
          fs.unlinkSync(localePath);
        }
      }
    }

    // Remove unnecessary files
    const filesToRemoveWin = [...filesToRemove, "LICENSES.chromium.html"];

    cleanDirectory(appOutDir, filesToRemoveWin, foldersToSkip);
  } else if (platform === "linux") {
    // Clean up locales - keep only English
    const localesPath = path.join(appOutDir, "locales");
    if (fs.existsSync(localesPath)) {
      const localesToKeep = ["en-US.pak", "en-GB.pak"];
      const locales = fs.readdirSync(localesPath);

      for (const locale of locales) {
        if (!localesToKeep.includes(locale)) {
          const localePath = path.join(localesPath, locale);
          console.log(`Removing locale: ${localePath}`);
          fs.unlinkSync(localePath);
        }
      }
    }

    // Remove unnecessary files
    const filesToRemoveLinux = [...filesToRemove, "LICENSES.chromium.html"];

    cleanDirectory(appOutDir, filesToRemoveLinux, foldersToSkip);
  }

  console.log("Size optimization completed");
};
