import fs from 'fs';
import path from 'path';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function WhitepaperPage() {
  const session = await getServerSession(authOptions);
  const launchUrl = session ? "/wallet" : "/login";

  const htmlPath = path.join(process.cwd(), 'public', 'whitepaper.html');
  const fullHtml = fs.readFileSync(htmlPath, 'utf-8');
  
  const styleMatch = fullHtml.match(/<style>([\s\S]*?)<\/style>/i);
  const styles = styleMatch ? styleMatch[1] : '';

  let bodyContent = fullHtml.split(/<body[^>]*>/i)[1]?.split(/<\/body>/i)[0] || '';
  bodyContent = bodyContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  bodyContent = bodyContent.replace(/<footer[\s\S]*?<\/footer>/gi, '');
  bodyContent = bodyContent.replace('href="/wallet" id="nav-cta-btn"', `href="${launchUrl}" id="nav-cta-btn"`);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div dangerouslySetInnerHTML={{ __html: bodyContent }} suppressHydrationWarning />
    </>
  );
}
