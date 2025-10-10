export function MintingHero() {
  return (
    <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg p-4 sm:p-5 text-white">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold mb-1.5">
            Cross-Chain NFT Minting
          </h2>
          <p className="text-sm text-blue-100">
            Experience true chain abstraction in action
          </p>
        </div>
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
        </div>
      </div>
      <p className="text-xs text-blue-50">
        Mint an NFT on Avalanche using funds from any supported chain—no
        manual bridging required
      </p>
    </div>
  );
}
