const fs = require('fs');
const path = require('path');

function convert(fileIn, fileOut, componentName) {
  let html = fs.readFileSync(fileIn, 'utf-8');
  
  // Extract body content or main content if possible
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    html = bodyMatch[1];
  }
  
  // Basic JSX conversions
  let jsx = html
    .replace(/class=/g, 'className=')
    .replace(/for=/g, 'htmlFor=')
    .replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}')
    .replace(/<br>/g, '<br />')
    .replace(/<hr>/g, '<hr />')
    .replace(/stroke-width=/g, 'strokeWidth=')
    .replace(/stroke-linecap=/g, 'strokeLinecap=')
    .replace(/stroke-linejoin=/g, 'strokeLinejoin=')
    .replace(/fill-rule=/g, 'fillRule=')
    .replace(/clip-rule=/g, 'clipRule=')
    .replace(/<img([^>]*?)(?<!\/)>/g, '<img$1 />')
    .replace(/<input([^>]*?)(?<!\/)>/g, '<input$1 />')
    .replace(/<path([^>]*?)(?<!\/)>/g, '<path$1 />')
    .replace(/<circle([^>]*?)(?<!\/)>/g, '<circle$1 />')
    .replace(/<rect([^>]*?)(?<!\/)>/g, '<rect$1 />')
    .replace(/<line([^>]*?)(?<!\/)>/g, '<line$1 />')
    .replace(/<polyline([^>]*?)(?<!\/)>/g, '<polyline$1 />');

  // Handle style=" "
  jsx = jsx.replace(/style="([^"]*)"/g, (match, styleString) => {
    const styles = {};
    styleString.split(';').forEach(s => {
      const parts = s.split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim().replace(/-([a-z])/g, g => g[1].toUpperCase());
        const value = parts.slice(1).join(':').trim();
        styles[key] = value;
      }
    });
    return `style={${JSON.stringify(styles)}}`;
  });

  const finalCode = `import Link from "next/link";
import { PactLogo } from "@/components/PactLogo";

export default function ${componentName}() {
  return (
    <>
      ${jsx}
    </>
  );
}`;

  // Ensure dir exists
  const dir = path.dirname(fileOut);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fileOut, finalCode, 'utf-8');
}

convert('docs.html', 'app/docs/page.tsx', 'DocsPage');
convert('privacy.html', 'app/privacy/page.tsx', 'PrivacyPage');
convert('terms.html', 'app/terms/page.tsx', 'TermsPage');
console.log("Done");
