const fs = require('fs');

function updateHtml(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');

  // We want to replace the "Network Status", "Status", and "Audits" links with social icons.
  // The social icons block to inject:
  const socialIcons = `
    <div class="flex items-center gap-6 ml-4">
      <a href="https://github.com/danielamodu" target="_blank" class="hover:text-coral transition-colors text-[16px]"><iconify-icon icon="lucide:github"></iconify-icon></a>
      <a href="https://x.com/szrxbt" target="_blank" class="hover:text-coral transition-colors text-[16px]"><iconify-icon icon="lucide:twitter"></iconify-icon></a>
      <a href="https://t.me/fortyxbt" target="_blank" class="hover:text-coral transition-colors text-[16px]"><iconify-icon icon="lucide:send"></iconify-icon></a>
    </div>
  `;

  // Docs HTML
  if (filePath.includes('docs.html')) {
    html = html.replace(
      /<a href="[^"]*"[^>]*>Network Status<\/a>/,
      socialIcons
    );
  }

  // Privacy HTML
  if (filePath.includes('privacy.html')) {
    html = html.replace(
      /<a href="[^"]*"[^>]*>Status<\/a>/,
      socialIcons
    );
  }

  // Terms HTML
  if (filePath.includes('terms.html')) {
    // Has Audits and Status
    html = html.replace(
      /<a href="[^"]*"[^>]*>Audits<\/a>[\s\S]*?<a href="[^"]*"[^>]*>Status<\/a>/,
      socialIcons
    );
  }

  fs.writeFileSync(filePath, html, 'utf8');
  console.log('Updated', filePath);
}

['public/docs.html', 'public/privacy.html', 'public/terms.html'].forEach(updateHtml);
