const fs = require('fs');
const path = require('path');

const files = [
  'app/page.tsx',
  'app/login/page.tsx',
  'app/setup/page.tsx',
  'app/permission/page.tsx',
  'app/balance/page.tsx',
  'app/active/page.tsx',
  'components/PactSpikeDashboard.tsx'
];

files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace class=" with className=" for tags except iconify-icon
  // Let's do a safe replacement where we find class=" in JSX tags.
  // A simple regex approach: replace class=" in the document, and if it's on iconify-icon, keep it or change it (iconify-icon supports class and className).
  // Actually, replacing all class=" with className=" works perfectly because React and next-compiler translates className correctly.
  content = content.replace(/\bclass="/g, 'className="');
  content = content.replace(/\bclass=\{/g, 'className={');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed classes in ${file}`);
});
