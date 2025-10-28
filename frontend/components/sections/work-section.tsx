"use client"

import { useReveal } from "@/hooks/use-reveal"

export function HowItWorksSection() {
  const { ref, isVisible } = useReveal(0.3)

  return (
    <section
      ref={ref}
      className="flex h-screen w-screen shrink-0 snap-start items-center px-6 pt-20 md:px-12 md:pt-0 lg:px-16"
    >
      <div className="mx-auto w-full max-w-7xl max-h-[90vh] md:max-h-[60vh] lg:max-h-[60vh]">
        <div
          className={`mb-12 transition-all duration-700 md:mb-16 ${
            isVisible ? "translate-x-0 opacity-100" : "-translate-x-12 opacity-0"
          }`}
        >
          <h2 className="mb-2 font-sans text-3xl font-light tracking-tight text-foreground md:text-4xl lg:text-5xl">
            How It Works
          </h2>
          <p className="font-mono text-sm text-foreground/60 md:text-base">/ Transform your documents into actionable insights in three simple steps.</p>
        </div>

        <div className="space-y-6 md:space-y-8">
          {[
            {
              number: "01",
              title: "Securely Upload",
              category: "Drag and drop your PDF, DOCX, or TXT file. Data stays encrypted and private.",
              year: "",
              direction: "left",
            },
            {
              number: "02",
              title: "Get Instant Analysis",
              category: "AI generates dashboards with summaries, risks, and insights instantly.",
              year: "",
              direction: "right",
            },
            {
              number: "03",
              title: "Ask Anything",
              category: "Use the Ask AI Expert feature to get plain-English answers.",
              year: "",
              direction: "left",
            },
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
        marginLeft: index % 2 === 0 ? "0" : "auto",
        maxWidth: index % 2 === 0 ? "85%" : "90%",
      }}
    >
      <div className="flex items-baseline gap-4 md:gap-8">
        <span className="font-mono text-sm text-foreground/30 transition-colors group-hover:text-foreground/50 md:text-base">
          {project.number}
        </span>
        <div>
          <h3 className="mb-1 font-sans text-l font-light text-foreground transition-transform duration-300 group-hover:translate-x-2 md:text-xl lg:text-2xl">
            {project.title}
          </h3>
          <p className="font-mono text-xs text-foreground/50 md:text-sm">{project.category}</p>
        </div>
      </div>
      <span className="font-mono text-xs text-foreground/30 md:text-sm">{project.year}</span>
    </div>
  )
}
