"use client"

import { useMemo } from "react"

type RiskItemProps = {
  risk: string
}

export function RiskItem({ risk }: RiskItemProps) {
  const parsedRisk = useMemo(() => {
    try {
      // Attempt to parse the risk string as JSON
      return JSON.parse(risk)
    } catch (error) {
      // If parsing fails, return null or a default structure
      console.error("Failed to parse risk JSON:", error)
      return null
    }
  }, [risk])

  if (!parsedRisk) {
    // Render the original string if it's not valid JSON
    return <li>{risk}</li>
  }

  const { clause, explanation } = parsedRisk

  return (
    <li className="mb-4">
      <h4 className="text-lg font-bold text-white">{clause}</h4>
      <p className="text-white/80">{explanation}</p>
    </li>
  )
}
