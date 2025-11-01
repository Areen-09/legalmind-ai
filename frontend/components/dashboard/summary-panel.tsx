import React from 'react';

interface SummaryPanelProps {
  summary: string;
}

const SummaryPanel: React.FC<SummaryPanelProps> = ({ summary }) => {
  return (
    <div className="rounded-xl bg-black/25 p-4 text-white/90 backdrop-blur-xl ring-1 ring-white/10">
      <h3 className="mb-2 text-lg font-medium text-white">Summary</h3>
      <p className="whitespace-pre-wrap text-white/80">{summary || "—"}</p>
    </div>
  );
};

export default SummaryPanel;
