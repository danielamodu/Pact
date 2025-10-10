interface ContractInfoProps {
  contractAddress: string;
  chainName: string;
}

export function ContractInfo({ contractAddress, chainName }: ContractInfoProps) {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-3 mb-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-sm">
            <svg
              className="w-4 h-4 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Target Contract
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full">
          <svg
            className="w-3 h-3"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
              clipRule="evenodd"
            />
          </svg>
          {chainName}
        </span>
      </div>
      <p className="text-xs font-mono text-gray-900 break-all bg-white px-2.5 py-1.5 rounded-lg border border-gray-200">
        {contractAddress}
      </p>
    </div>
  );
}
