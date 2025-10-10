export function HowItWorks() {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
          <svg
            className="w-4 h-4 text-blue-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        How It Works
      </h3>
      <div className="grid gap-3">
        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-sm">
            1
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm mb-0.5">
              Deposit Assets
            </p>
            <p className="text-xs text-gray-600">
              Send any{" "}
              <a
                href="https://developers.particle.network/universal-accounts/cha/chains#primary-assets"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                primary asset
              </a>{" "}
              to your Universal Account on any{" "}
              <a
                href="https://developers.particle.network/universal-accounts/cha/chains"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                supported chain
              </a>
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-sm">
            2
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm mb-0.5">
              Unified Balance
            </p>
            <p className="text-xs text-gray-600">
              All your assets are unified into one balance across all chains
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-sm">
            3
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm mb-0.5">
              Auto Source Funds
            </p>
            <p className="text-xs text-gray-600">
              Required funds automatically bridge to Avalanche when needed
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-sm">
            4
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm mb-0.5">
              Execute Transaction
            </p>
            <p className="text-xs text-gray-600">
              NFT mints on Avalanche—all in one seamless operation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
