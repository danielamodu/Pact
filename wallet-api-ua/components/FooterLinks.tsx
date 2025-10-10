export function FooterLinks() {
  return (
    <div className="mt-5 bg-white rounded-xl shadow-lg p-4">
      <div className="text-center mb-3">
        <h3 className="text-base font-semibold text-gray-900 mb-0.5">
          Learn More
        </h3>
        <p className="text-xs text-gray-600">
          Explore the documentation and source code
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Magic Docs */}
        <a
          href="https://docs.magic.link/api-wallets/introduction"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2.5 p-3 bg-gradient-to-br from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-lg border border-purple-200 transition-all duration-200 hover:shadow-sm"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors text-sm">
              Magic Docs
            </div>
            <div className="text-xs text-gray-600">Wallet API Guide</div>
          </div>
          <svg
            className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors flex-shrink-0"
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

        {/* Particle Docs */}
        <a
          href="https://developers.particle.network/universal-accounts/cha/overview"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2.5 p-3 bg-gradient-to-br from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 rounded-lg border border-blue-200 transition-all duration-200 hover:shadow-sm"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors text-sm">
              Particle Docs
            </div>
            <div className="text-xs text-gray-600">Universal Accounts</div>
          </div>
          <svg
            className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0"
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

        {/* GitHub Repo */}
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2.5 p-3 bg-gradient-to-br from-gray-50 to-slate-50 hover:from-gray-100 hover:to-slate-100 rounded-lg border border-gray-200 transition-all duration-200 hover:shadow-sm"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-gray-700 to-slate-800 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg
              className="w-4 h-4 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors text-sm">
              GitHub Repo
            </div>
            <div className="text-xs text-gray-600">View Source Code</div>
          </div>
          <svg
            className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0"
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
  );
}
