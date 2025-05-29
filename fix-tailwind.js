#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Mapping of common shorthand replacements
const shorthandReplacements = [
  // Size shorthands
  { pattern: /\bh-(\d+)\s+w-\1\b/g, replacement: "size-$1" },
  { pattern: /\bw-(\d+)\s+h-\1\b/g, replacement: "size-$1" },
  { pattern: /\bh-full\s+w-full\b/g, replacement: "size-full" },
  { pattern: /\bw-full\s+h-full\b/g, replacement: "size-full" },

  // Padding shorthands
  { pattern: /\bpy-0\s+px-0\b/g, replacement: "p-0" },
  { pattern: /\bpx-0\s+py-0\b/g, replacement: "p-0" },

  // Inset shorthands
  { pattern: /\bleft-0\s+right-0\b/g, replacement: "inset-x-0" },
  { pattern: /\bright-0\s+left-0\b/g, replacement: "inset-x-0" },
  { pattern: /\btop-0\s+bottom-0\b/g, replacement: "inset-y-0" },
  { pattern: /\bbottom-0\s+top-0\b/g, replacement: "inset-y-0" },
];

// Legacy class replacements
const legacyReplacements = [
  { pattern: /\bflex-grow\b/g, replacement: "grow" },
  { pattern: /\bflex-shrink\b/g, replacement: "shrink" },
  { pattern: /\btransform\s+/g, replacement: "" }, // Remove unnecessary transform
];

function fixFileContent(content) {
  let fixedContent = content;

  // Apply shorthand replacements
  shorthandReplacements.forEach(({ pattern, replacement }) => {
    fixedContent = fixedContent.replace(pattern, replacement);
  });

  // Apply legacy replacements
  legacyReplacements.forEach(({ pattern, replacement }) => {
    fixedContent = fixedContent.replace(pattern, replacement);
  });

  return fixedContent;
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const fixedContent = fixFileContent(content);

    if (content !== fixedContent) {
      fs.writeFileSync(filePath, fixedContent, "utf8");
      console.log(`Fixed: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

function findFiles(dir, extensions = [".tsx", ".ts", ".jsx", ".js"]) {
  let files = [];

  try {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (
        stat.isDirectory() &&
        !item.startsWith(".") &&
        item !== "node_modules"
      ) {
        files = files.concat(findFiles(fullPath, extensions));
      } else if (
        stat.isFile() &&
        extensions.some((ext) => item.endsWith(ext))
      ) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }

  return files;
}

function main() {
  console.log("🔧 Fixing Tailwind CSS shorthand violations...\n");

  const directories = ["app", "components", "lib"];
  let totalFixed = 0;

  directories.forEach((dir) => {
    if (fs.existsSync(dir)) {
      console.log(`Processing ${dir}/...`);
      const files = findFiles(dir);

      files.forEach((file) => {
        if (processFile(file)) {
          totalFixed++;
        }
      });
    }
  });

  console.log(`\n✅ Fixed ${totalFixed} files`);

  // Run prettier to fix class ordering
  console.log("\n🎨 Running Prettier to fix class ordering...");
  try {
    execSync(
      'npx prettier --write "**/*.{ts,tsx,js,jsx}" --ignore-path .gitignore',
      { stdio: "inherit" },
    );
    console.log("✅ Prettier formatting completed");
  } catch (error) {
    console.error("⚠️  Prettier formatting failed:", error.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixFileContent, processFile };
