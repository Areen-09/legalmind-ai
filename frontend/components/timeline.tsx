"use client"

import React from "react"

export type TimelineEvent = {
  date: string
  title: string
  description: string
  isRisk?: boolean
}

type TimelineProps = {
  data: TimelineEvent[]
}

export const Timeline = ({ data }: TimelineProps) => {
  if (!data || data.length === 0) {
    return <p className="text-white/70">No timeline data available for this document.</p>
  }

  return (
    <div className="relative">
      <div className="absolute left-1/2 h-full w-0.5 bg-white/20" />
      {data.map((event, index) => (
        <div key={index} className="relative mb-8 flex items-center">
          <div className={`absolute left-1/2 w-4 h-4 -translate-x-1/2 rounded-full ${event.isRisk ? "bg-red-500" : "bg-white/50"}`} />
          <div className={`w-1/2 p-4 ${index % 2 === 0 ? "pr-8 text-right" : "pl-8 text-left ml-auto"}`}>
            <p className="text-sm text-white/60">{event.date}</p>
            <h3 className="font-semibold text-white">{event.title}</h3>
            <p className="text-white/80">{event.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
