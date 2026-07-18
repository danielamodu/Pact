const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dir = path.join(__dirname, '..', '.superdesign', 'downloads_v2');
const files = fs.readdirSync(dir);

files.forEach(file => {
  if (file.endsWith('.json')) {
    const filePath = path.join(dir, file);
    try {
      // It contains minified HTML content, let's format it.
      let content = fs.readFileSync(filePath, 'utf8');
      
      // If it is JSON or HTML disguised, let's check
      try {
        const parsed = JSON.parse(content);
        content = JSON.stringify(parsed, null, 2);
      } catch (e) {
        // Not JSON, probably minified HTML. Let's just prettify or split lines at tags
        content = content.replace(/>/g, '>\n').replace(/</g, '\n<');
      }
      
      const outPath = path.join(dir, file.replace('.json', '.html'));
      fs.writeFileSync(outPath, content, 'utf8');
      console.log(`Prettified ${file} to ${path.basename(outPath)}`);
    } catch (e) {
      console.error(`Error formatting ${file}:`, e.message);
    }
  }
});
