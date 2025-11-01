"use client"

import { useEffect, useState } from "react"

const quotes = [
  {
    text: "Justice delayed is justice denied.",
    author: "William E. Gladstone",
  },
  {
    text: "The law is reason, free from passion.",
    author: "Aristotle",
  },
  {
    text: "Injustice anywhere is a threat to justice everywhere.",
    author: "Martin Luther King Jr.",
  },
  {
    text: "The life of the law has not been logic; it has been experience.",
    author: "Oliver Wendell Holmes Jr.",
  },
  {
    text: "It is not wisdom but Authority that makes a law.",
    author: "Thomas Hobbes",
  },
  {
    text: "The law will not relieve a man of the consequences of his own imprudence.",
    author: "Anonymous",
  },
  {
    text: "A law is valuable, not because it is a law, but because there is right in it.",
    author: "Henry Ward Beecher",
  },
  {
    text: "No man is above the law and no man is below it: nor do we ask any man's permission when we ask him to obey it.",
    author: "Theodore Roosevelt",
  },
  {
    text: "The good of the people is the chief law.",
    author: "Cicero",
  },
  {
    text: "If we would have justice for all, we must plant the seed of justice within ourselves.",
    author: "Bryant H. McGill",
  },
]

type AnalyzingDocumentProps = {
  progress: {
    percentage: number
    message: string
  } | null
}

export default function AnalyzingDocument({ progress }: AnalyzingDocumentProps) {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuoteIndex((prevIndex) => (prevIndex + 1) % quotes.length)
    }, 60000) // 1 minute

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-lg">
      <div className="w-full max-w-md rounded-2xl bg-gray-800/80 p-8 text-center text-white shadow-2xl">
        <h2 className="text-2xl font-semibold">Analyzing Document</h2>
        <div className="my-8 h-24 flex items-center justify-center">
          <div className="transition-opacity duration-500">
            <p className="text-lg italic">"{quotes[currentQuoteIndex].text}"</p>
            <p className="mt-2 text-sm text-gray-400">- {quotes[currentQuoteIndex].author}</p>
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between text-sm text-white/80">
            <span>{progress?.message || "Initializing..."}</span>
            <span>{progress?.percentage ?? 0}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/10">
            <div
              className="h-2 rounded-full bg-white/70 transition-all duration-500"
              style={{ width: `${progress?.percentage ?? 0}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
