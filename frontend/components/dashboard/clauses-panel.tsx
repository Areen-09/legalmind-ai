import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface Clause {
  clause: string;
  explanation: string;
}

interface ClausesPanelProps {
  clauses: Clause[];
  activeClause: string | null;
  setActiveClause: (value: string | null) => void;
}

const ClausesPanel: React.FC<ClausesPanelProps> = ({ clauses, activeClause, setActiveClause }) => {
  return (
    <div className="rounded-xl bg-black/25 p-4 text-white/90 backdrop-blur-xl ring-1 ring-white/10">
      <h3 className="mb-2 text-lg font-medium text-white">Clauses</h3>
      <Accordion type="single" collapsible className="w-full">
        {clauses.map((item, index) => (
          <AccordionItem key={index} value={`item-${index}`} className="border-b-0">
            <AccordionTrigger
              className="my-1 rounded-lg bg-white/10 px-3 py-2 text-left text-sm font-medium text-white/80 hover:bg-white/20"
              onClick={() => setActiveClause(activeClause === `item-${index}` ? null : `item-${index}`)}
            >
              {item.clause}
            </AccordionTrigger>
            <AccordionContent className="mt-1 rounded-lg bg-black/20 p-3 text-sm text-white/70">{item.explanation}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default ClausesPanel;
