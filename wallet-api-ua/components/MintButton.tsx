interface MintButtonProps {
  onClick: () => void;
  isMinting: boolean;
  disabled: boolean;
  txResult: string | null;
}

export function MintButton({ onClick, isMinting, disabled, txResult }: MintButtonProps) {
  return (
    <>
      <button
        onClick={onClick}
        disabled={disabled}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3.5 px-5 rounded-lg transition-all duration-200 flex items-center justify-center gap-2.5 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none disabled:shadow-md"
      >
        {isMinting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span className="text-base">Minting NFT...</span>
          </>
        ) : (
          <>
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
            <span className="text-base">Mint Cross-Chain NFT</span>
          </>
        )}
      </button>

      {disabled && !isMinting && (
        <p className="text-center text-xs text-gray-500 mt-2">
          Initializing Universal Account...
        </p>
      )}

      {/* Transaction Result */}
      {txResult && (
        <div className="mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {txResult.startsWith("Error:") ? (
            <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-lg p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-red-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-red-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-red-900 mb-1.5 text-base">
                    Transaction Failed
                  </h4>
                  <p className="text-xs text-red-800 bg-white/50 rounded-lg px-2.5 py-1.5">
                    {txResult}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-200 rounded-lg p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-green-900 mb-0.5 text-base">
                    NFT Minted Successfully! 🎉
                  </h4>
                  <p className="text-xs text-green-800 mb-2">
                    Your cross-chain transaction was executed seamlessly
                  </p>
                  <a
                    href={txResult}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 rounded-lg transition-colors shadow-sm text-sm"
                  >
                    <span>View on UniversalX</span>
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
