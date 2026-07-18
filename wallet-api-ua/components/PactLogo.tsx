export function PactLogo({ className = "w-12 h-12", inverted = false }: { className?: string, inverted?: boolean }) {
  const bgColor = inverted ? "white" : "#1A3C2B";
  const fgColor = inverted ? "#1A3C2B" : "white";
  
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill={bgColor} />
      <circle cx="82" cy="18" r="8" fill={fgColor} />
      <text x="8" y="88" fill={fgColor} fontSize="34" fontWeight="bold" fontFamily="Space Grotesk, sans-serif" letterSpacing="-1.5">Pact.</text>
    </svg>
  );
}
