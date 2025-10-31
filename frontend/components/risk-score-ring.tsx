"use client"

import { useEffect, useState } from "react"

type RiskScoreRingProps = {
  score: number
  className?: string
}

export function RiskScoreRing({ score, className }: RiskScoreRingProps) {
  const [offset, setOffset] = useState(0)
  const radius = 50
  const circumference = 2 * Math.PI * radius

  useEffect(() => {
    const progress = score / 100
    const newOffset = circumference * (1 - progress)
    setOffset(newOffset)
  }, [score, circumference])

  const scoreColor = score > 75 ? "text-red-400" : score > 50 ? "text-yellow-400" : "text-green-400"

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg className="h-full w-full" viewBox="0 0 120 120">
        <circle
          className="text-white/10"
          strokeWidth="10"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="60"
          cy="60"
        />
        <circle
          className={`transform -rotate-90 origin-center ${scoreColor}`}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="60"
          cy="60"
          style={{ transition: "stroke-dashoffset 0.5s ease-out" }}
        />
      </svg>
    </div>
  )
}
