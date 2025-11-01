import React from 'react';

interface EntitiesPanelProps {
  entities: string[];
}

const EntitiesPanel: React.FC<EntitiesPanelProps> = ({ entities }) => {
  return (
    <div className="rounded-xl bg-black/25 p-4 text-white/90 backdrop-blur-xl ring-1 ring-white/10">
      <h3 className="mb-2 text-lg font-medium text-white">Entities Involved</h3>
      <ul className="list-disc space-y-2 pl-5 text-white/80">
        {entities.map((entity, index) => (
          <li key={index}>{entity}</li>
        ))}
      </ul>
    </div>
  );
};

export default EntitiesPanel;
