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
 * @param {Array<string>} foldersToClean Folders to clean entirely
 */
function cleanDirectory(dir, patterns = [], foldersToClean = []) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Clean entire folder if in our list
      if (foldersToClean.includes(entry.name)) {
        console.log(`Removing directory: ${fullPath}`);
        fs.rmSync(fullPath, { recursive: true, force: true });
        continue;
      }

      // Otherwise recurse into directory
      cleanDirectory(fullPath, patterns, foldersToClean);
      continue;
    }

    // Check if file matches any pattern
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
 * Main function to remove unnecessary files after packaging
 */
exports.default = async function (context) {
  const { appOutDir, packager } = context;
  const platform = packager.platform.name;

  console.log(`Cleaning up package for platform: ${platform}`);

  // Files and patterns to remove on all platforms
  const filesToRemove = [
    // Unused locales
    // Keep only en-US and a few common ones
    // Full list will depend on your target audience
  ];

  // Folders to clean entirely (common for all platforms)
  const foldersToClean = [
    // Careful with this - only remove folders you're certain are unnecessary
  ];

  // Platform-specific files to clean up
  if (platform === "mac") {
    // macOS specific cleanup
    const resourcesPath = path.join(
      appOutDir,
      "Stupid Port Snitch.app",
      "Contents",
      "Resources"
    );
    if (fs.existsSync(resourcesPath)) {
      const macLocalesPath = path.join(resourcesPath, "locale");
      if (fs.existsSync(macLocalesPath)) {
        // Keep only necessary locales
        const localesToKeep = ["en-US.pak", "en-GB.pak"];
        const locales = fs.readdirSync(macLocalesPath);
        for (const locale of locales) {
          if (!localesToKeep.includes(locale)) {
            const localePath = path.join(macLocalesPath, locale);
            console.log(`Removing locale: ${localePath}`);
            fs.unlinkSync(localePath);
          }
        }
      }
    }
  } else if (platform === "win") {
    // Windows specific cleanup
    const localesPath = path.join(appOutDir, "locales");
    if (fs.existsSync(localesPath)) {
      // Keep only necessary locales
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
  } else if (platform === "linux") {
    // Linux specific cleanup
    const localesPath = path.join(appOutDir, "locales");
    if (fs.existsSync(localesPath)) {
      // Keep only necessary locales
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
  }

  // Clean directories based on our configured patterns and folders
  cleanDirectory(appOutDir, filesToRemove, foldersToClean);

  console.log("Cleanup completed.");
};
