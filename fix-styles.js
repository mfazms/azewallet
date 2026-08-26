const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
};

const appDir = path.join(__dirname, 'src', 'app');
const globalsCssPath = path.join(appDir, 'globals.css');
const tsxFiles = walk(appDir);

let allCss = '\n/* --- EXTRACTED FROM PAGES --- */\n';

tsxFiles.forEach((file) => {
  let content = fs.readFileSync(file, 'utf8');
  // Match <style jsx>{` ... `}</style>
  const styleRegex = /<style\s+jsx>\s*\{\s*`([\s\S]*?)`\s*\}\s*<\/style>/g;
  let match;
  let hasChanges = false;
  
  while ((match = styleRegex.exec(content)) !== null) {
    allCss += `\n/* From ${path.basename(file)} */\n` + match[1];
    hasChanges = true;
  }
  
  if (hasChanges) {
    content = content.replace(/<style\s+jsx>\s*\{\s*`[\s\S]*?`\s*\}\s*<\/style>/g, '');
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Extracted CSS from ${file}`);
  }
});

// Also replace the primary green with Apple Blue in globals.css
let globalsCss = fs.readFileSync(globalsCssPath, 'utf8');

globalsCss = globalsCss.replace(/--color-income: #00D09C;/g, '--color-income: #007AFF;');
globalsCss = globalsCss.replace(/--color-income-bg: rgba\(0, 208, 156, 0.12\);/g, '--color-income-bg: rgba(0, 122, 255, 0.12);');
globalsCss = globalsCss.replace(/rgba\(0, 208, 156, 0.3\)/g, 'rgba(0, 122, 255, 0.3)'); // selection

// Append extracted CSS
globalsCss += allCss;

fs.writeFileSync(globalsCssPath, globalsCss, 'utf8');
console.log('Done appending CSS to globals.css and changed primary color to Apple Blue.');
