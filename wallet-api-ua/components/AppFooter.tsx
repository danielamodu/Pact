import Link from "next/link";

export function AppFooter() {
  return (
    <footer className="bg-white py-32 px-8 border-t border-forest/5 relative z-40">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-5 gap-20 mb-32">
          <div className="col-span-2">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-12 h-12 bg-forest flex items-center justify-center jeton-pill">
                <span className="font-bold text-white text-2xl font-space">P</span>
              </div>
              <span className="font-bold text-forest tracking-tight text-3xl font-space">Pact</span>
            </div>
            <p className="text-forest/50 text-xl max-w-sm mb-12 font-medium leading-relaxed font-sans">
              Autonomous infrastructure for recurring value exchange on-chain.
            </p>
            <div className="flex gap-8">
              <a href="#" className="w-14 h-14 bg-[#F7F7F5] jeton-pill flex items-center justify-center hover:bg-forest hover:text-white transition-all shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
              </a>
              <a href="#" className="w-14 h-14 bg-[#F7F7F5] jeton-pill flex items-center justify-center hover:bg-forest hover:text-white transition-all shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
              </a>
            </div>
          </div>
          
          <div>
            <h5 className="font-bold mb-10 uppercase tracking-widest text-[10px] text-forest/40 font-mono">App</h5>
            <ul className="space-y-6 text-forest/60 text-lg font-medium font-sans">
              <li><Link href="/wallet" className="hover:text-forest transition-colors">Dashboard</Link></li>
              <li><a href="#" className="hover:text-forest transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-forest transition-colors">Developer SDK</a></li>
              <li><a href="#" className="hover:text-forest transition-colors">Relayer Status</a></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold mb-10 uppercase tracking-widest text-[10px] text-forest/40 font-mono">Company</h5>
            <ul className="space-y-6 text-forest/60 text-lg font-medium font-sans">
              <li><a href="#" className="hover:text-forest transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-forest transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-forest transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-forest transition-colors">Security Center</a></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold mb-10 uppercase tracking-widest text-[10px] text-forest/40 font-mono">Support</h5>
            <ul className="space-y-6 text-forest/60 text-lg font-medium font-sans">
              <li><a href="#" className="hover:text-forest transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-forest transition-colors">Community</a></li>
              <li><a href="#" className="hover:text-forest transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-16 border-t border-forest/10 flex flex-col md:flex-row justify-between items-center gap-10">
          <p className="text-forest/30 text-[11px] font-mono uppercase tracking-[0.2em] font-bold">
            © 2024 PACT FOUNDATION. ALL RIGHTS RESERVED.
          </p>
          <div className="flex items-center gap-6 bg-forest/[0.03] px-6 py-3 jeton-pill border border-forest/5 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-mint animate-pulse"></div>
              <span className="text-forest/60 text-[10px] font-bold uppercase tracking-widest font-mono">Mainnet: Operational</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-mint animate-pulse"></div>
              <span className="text-forest/60 text-[10px] font-bold uppercase tracking-widest font-mono">Relay: 99.9%</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
