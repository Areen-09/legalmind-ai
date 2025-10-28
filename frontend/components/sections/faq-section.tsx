"use client"

import { useReveal } from "@/hooks/use-reveal"

export function FAQSection() {
  const { ref, isVisible } = useReveal(0.3)

  return (
    <section
      ref={ref}
      className="flex h-screen w-screen shrink-0 snap-start items-center px-6 pt-20 md:px-12 md:pt-0 lg:px-16"
    >
      <div className="mx-auto w-full max-w-7xl max-h-[90vh] md:max-h-[70vh] lg:max-h-[60vh]">
        <div
          className={`mb-12 transition-all duration-700 md:mb-5 ${
            isVisible ? "translate-x-0 opacity-100" : "-translate-x-12 opacity-0"
          }`}
        >
          <h2 className="mb-2 font-sans text-3xl font-light tracking-tight text-foreground md:text-4xl lg:text-5xl">
            FAQ
          </h2>
          <p className="font-mono text-sm text-foreground/60 md:text-base">/ Commonly asked questions.</p>
        </div>

        <div className="space-y-0 md:space-y-0">
          {[
            {
              number: "01",
              title: "What file formats can I upload?",
              category: "You can upload your legal documents in the most common formats: PDF, DOCX, and TXT.",
              year: "",
              direction: "left",
            },
            {
              number: "02",
              title: "How is my data kept secure?",
              category: "Security is a top priority. We use Firebase for secure authentication, and your files are stored securely in Firebase Storage. The AI-generated analysis is saved in a private Firestore database linked to your account.",
              year: "",
              direction: "left",
            },
            {
              number: "03",
              title: "How does the interactive chat feature work?",
              category: "After your document is analyzed, you can ask specific follow-up questions in the chat interface. The AI is context-aware, meaning it understands the content of your uploaded document and provides immediate, intelligent answers based on it.",
              year: "",
              direction: "left",
            },
            {
              number: "04",
              title: "What kind of analysis will I receive?",
              category: "The AI provides a comprehensive, multi-part analysis, including: a simplified summary of the entire document, a bulleted list of key clauses and points, and an assessment of potential risks or liabilities flagged in the text.",
              year: "",
              direction: "left",
            }
          ].map((project, i) => (
            <ProjectCard key={i} project={project} index={i} isVisible={isVisible} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ProjectCard({
  project,
  index,
  isVisible,
}: {
  project: { number: string; title: string; category: string; year: string; direction: string }
  index: number
  isVisible: boolean
}) {
  const getRevealClass = () => {
    if (!isVisible) {
      return project.direction === "left" ? "-translate-x-16 opacity-0" : "translate-x-16 opacity-0"
    }
    return "translate-x-0 opacity-100"
  }

  return (
    <div
      className={`group flex items-center justify-between border-b border-foreground/10 py-6 transition-all duration-700 hover:border-foreground/20 md:py-4 ${getRevealClass()}`}
      style={{
        transitionDelay: `${index * 150}ms`,
        maxWidth: index % 2 === 0 ? "85%" : "90%",
      }}
    >
      <div className="flex items-baseline gap-2 md:gap-0.5">
        <span className="font-mono text-sm text-foreground/30 transition-colors group-hover:text-foreground/50 md:text-base">
          {project.number}
        </span>
        <div>
          <h3 className="font-sans text-l font-light text-foreground transition-transform duration-300 group-hover:translate-x-2 md:text-s lg:text-m">
            {project.title}
          </h3>
          <p className="font-mono text-xs text-foreground/50 md:text-sm">{project.category}</p>
        </div>
      </div>
      <span className="font-mono text-xs text-foreground/30 md:text-sm">{project.year}</span>
    </div>
  )
}
