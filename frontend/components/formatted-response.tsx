"use client"

import React from "react"

export const FormattedResponse = ({ content }: { content: string }) => {
  const formatContent = (text: string) => {
    const sections = text.split(/(\*\*.*?\*\*)/g).filter(Boolean)

    return sections.map((section, index) => {
      if (section.startsWith("**") && section.endsWith("**")) {
        return (
          <div key={index} className="mt-4">
            <strong className="font-semibold text-white">{section.slice(2, -2)}</strong>
          </div>
        )
      }
      const items = section.split("*").filter((item) => item.trim() !== "")
      if (items.length > 1) {
        return (
          <ul key={index} className="list-disc pl-5 mt-2 space-y-1">
            {items.map((item, i) => (
              <li key={i} className="text-white/80">
                {item.trim()}
              </li>
            ))}
          </ul>
        )
      }
      return (
        <p key={index} className="text-white/80">
          {section.trim()}
        </p>
      )
    })
  }

  return <div>{formatContent(content)}</div>
}
