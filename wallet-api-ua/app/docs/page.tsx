import fs from 'fs';
import path from 'path';
import Script from 'next/script';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DocsPage() {
  const session = await getServerSession(authOptions);
  const launchUrl = session ? "/wallet" : "/login";

  const htmlPath = path.join(process.cwd(), 'public', 'docs.html');
  const fullHtml = fs.readFileSync(htmlPath, 'utf-8');

  const styleMatch = fullHtml.match(/<style>([\s\S]*?)<\/style>/i);
  const styles = styleMatch ? styleMatch[1] : '';

  let bodyContent = fullHtml.split(/<body[^>]*>/i)[1]?.split(/<\/body>/i)[0] || '';
  // Keep inline scripts (needed for sidebar scroll highlighting), strip only external ones
  bodyContent = bodyContent.replace(/<footer[\s\S]*?<\/footer>/gi, '');
  bodyContent = bodyContent.replace('href="/" id="nav-launch-app-btn"', `href="${launchUrl}" id="nav-launch-app-btn"`);
  bodyContent = bodyContent.replace('href="/" id="nav-cta-btn"', `href="${launchUrl}" id="nav-cta-btn"`);

  return (
    <>
      {/* Inject dependencies that docs.html needs from its <head> */}
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;800;900&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
      <Script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js" strategy="afterInteractive" />
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div dangerouslySetInnerHTML={{ __html: bodyContent }} suppressHydrationWarning />
    </>
  );
}
