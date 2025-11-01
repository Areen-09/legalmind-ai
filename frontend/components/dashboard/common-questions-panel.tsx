import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface QA {
  question: string;
  answer: string;
}

interface CommonQAPanelProps {
  qa: QA[];
}

const CommonQAPanel: React.FC<CommonQAPanelProps> = ({ qa }) => {
  return (
    <div className="rounded-xl bg-black/25 p-4 text-white/90 backdrop-blur-xl ring-1 ring-white/10">
      <h3 className="mb-2 text-lg font-medium text-white">Common Q&A</h3>
      <Accordion type="single" collapsible className="w-full">
        {(qa || []).map((item, index) => (
          <AccordionItem key={index} value={`item-${index}`} className="border-b-0">
            <AccordionTrigger
              className="my-1 rounded-lg bg-white/10 px-3 py-2 text-left text-sm font-medium text-white/80 hover:bg-white/20"
            >
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="mt-1 rounded-lg bg-black/20 p-3 text-sm text-white/70">{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default CommonQAPanel;
