const fs = require('fs');

['public/docs.html', 'public/privacy.html', 'public/terms.html'].forEach(file => {
  let html = fs.readFileSync(file, 'utf8');
  
  html = html.replace(/href="#"/g, (match, offset) => {
    // Look ahead 300 chars
    const snippet = html.substring(offset, offset + 300);
    
    if (snippet.includes('Launch App') || snippet.includes('Back to App') || snippet.includes('Status') || snippet.includes('Security Portal')) {
      return 'href="/"';
    }
    if (snippet.includes('Docs')) {
      return 'href="/docs"';
    }
    if (snippet.includes('Privacy')) {
      return 'href="/privacy"';
    }
    if (snippet.includes('Terms')) {
      return 'href="/terms"';
    }
    if (snippet.includes('Audits')) {
      return 'href="/"'; 
    }
    
    return match;
  });

  fs.writeFileSync(file, html, 'utf8');
  console.log('Updated links in', file);
});
