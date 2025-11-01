"use client"

type RiskItemProps = {
  risk: {
    clause?: string
    explanation: string
  }
}

export function RiskItem({ risk }: RiskItemProps) {
  if (!risk) return null

  const { clause, explanation } = risk

  if (clause) {
    return (
      <li className="mb-4">
        <h4 className="text-lg font-bold text-white">{clause}</h4>
        <p className="text-white/80">{explanation}</p>
      </li>
    )
  }

  return <li>{explanation}</li>
}
