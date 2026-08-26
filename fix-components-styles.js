const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
};

const componentsDir = path.join(__dirname, 'src', 'components');
const featuresDir = path.join(__dirname, 'src', 'features');
const globalsCssPath = path.join(__dirname, 'src', 'app', 'globals.css');

let tsxFiles = [...walk(componentsDir), ...walk(featuresDir)];

let allCss = '\n/* --- EXTRACTED FROM COMPONENTS --- */\n';
let hasAnyChanges = false;

tsxFiles.forEach((file) => {
  let content = fs.readFileSync(file, 'utf8');
  // Match <style jsx>{` ... `}</style> OR <style jsx global>{` ... `}</style>
  const styleRegex = /<style\s+jsx(?:\s+global)?>\s*\{\s*`([\s\S]*?)`\s*\}\s*<\/style>/g;
  let match;
  let hasChanges = false;
  
  while ((match = styleRegex.exec(content)) !== null) {
    allCss += `\n/* From ${path.basename(file)} */\n` + match[1];
    hasChanges = true;
    hasAnyChanges = true;
  }
  
  if (hasChanges) {
    content = content.replace(/<style\s+jsx(?:\s+global)?>\s*\{\s*`[\s\S]*?`\s*\}\s*<\/style>/g, '');
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Extracted CSS from ${file}`);
  }
});

if (hasAnyChanges) {
  let globalsCss = fs.readFileSync(globalsCssPath, 'utf8');
  globalsCss += allCss;
  fs.writeFileSync(globalsCssPath, globalsCss, 'utf8');
  console.log('Done appending components CSS to globals.css');
} else {
  console.log('No styled-jsx found in components.');
}
