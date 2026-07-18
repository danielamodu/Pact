"use client";

interface PlanCardProps {
  planName: string;
  token: string;
  status: "active" | "paused";
  price: string;
  subscribers: number;
  revenue: string;
  onToggleActive?: () => void;
}

export function PlanCard({
  planName,
  token,
  status,
  price,
  subscribers,
  revenue,
  onToggleActive,
}: PlanCardProps) {
  const isPaused = status === "paused";

  return (
    <div className="relative bg-white/50 backdrop-blur-md border border-[#3A3A38]/20 p-8 flex flex-col justify-between h-full group hover:border-forest transition-colors duration-300">
      {/* Corner Markers */}
      <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-forest"></div>
      <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-forest"></div>
      <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-forest"></div>
      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-forest"></div>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <span className="font-mono text-[9px] uppercase tracking-widest text-forest/40">
            MERCHANT PLAN
          </span>
          <button
            onClick={onToggleActive}
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 border text-[9px] font-mono font-bold uppercase tracking-widest cursor-pointer hover:opacity-85 ${
              isPaused
                ? "border-gold/30 bg-gold/10 text-[#a8820a]"
                : "border-mint/20 bg-mint/10 text-forest"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isPaused ? "bg-[#a8820a]" : "bg-forest"}`}></span>
            {status}
          </button>
        </div>

        <div className="space-y-1">
          <h4 className="font-space text-xl font-bold uppercase tracking-tight text-forest">
            {planName}
          </h4>
          <p className="font-mono text-sm font-bold text-forest">{price}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-[#3A3A38]/10">
        <div>
          <span className="font-mono text-[8px] uppercase tracking-widest text-forest/40 block mb-0.5">
            Subscribers
          </span>
          <span className="font-space text-lg font-bold text-forest">
            {subscribers}
          </span>
        </div>
        <div>
          <span className="font-mono text-[8px] uppercase tracking-widest text-forest/40 block mb-0.5">
            Total Revenue
          </span>
          <span className="font-space text-lg font-bold text-forest">
            {revenue}
          </span>
        </div>
      </div>
    </div>
  );
}
