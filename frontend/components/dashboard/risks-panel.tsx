import React from 'react';

export interface Risk {
  level: 'No risks' | 'Medium' | 'Strong';
  description: string;
}

export interface RisksPanelProps {
  financialRisk: Risk;
  complianceRisk: Risk;
  timelineRisk: Risk;
}

const RiskCategory: React.FC<{ title: string; risk: Risk }> = ({ title, risk }) => {
  const getRiskColor = (level: 'No risks' | 'Medium' | 'Strong') => {
    switch (level) {
      case 'No risks':
        return 'text-green-500';
      case 'Medium':
        return 'text-yellow-500';
      case 'Strong':
        return 'text-red-500';
      default:
        return 'text-white';
    }
  };

  return (
    <div>
      <h4 className="font-semibold text-white">{title}</h4>
      <p className={`text-sm ${getRiskColor(risk.level)}`}>{risk.level}</p>
      <p className="text-sm text-white/70">{risk.description}</p>
    </div>
  );
};

const RisksPanel: React.FC<RisksPanelProps> = ({ financialRisk, complianceRisk, timelineRisk }) => {
  return (
    <div className="rounded-xl bg-black/25 p-4 text-white/90 backdrop-blur-xl ring-1 ring-white/10">
      <h3 className="mb-2 text-lg font-medium text-white">Risks</h3>
      <div className="space-y-4">
        <RiskCategory title="Financial Risk" risk={financialRisk} />
        <RiskCategory title="Compliance Risk" risk={complianceRisk} />
        <RiskCategory title="Timeline Risk" risk={timelineRisk} />
      </div>
    </div>
  );
};

export default RisksPanel;
