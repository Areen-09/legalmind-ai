"use client"

import { useEffect, useRef, useState } from "react"
import { Shader, ChromaFlow, Swirl } from "shaders/react"
import { CustomCursor } from "@/components/custom-cursor"
import { GrainOverlay } from "@/components/grain-overlay"
import { MagneticButton } from "@/components/magnetic-button"
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, User } from "firebase/auth"
import { auth } from "../../lib/firebase"
import { ProfileDropdown } from "@/components/profile-dropdown"

export default function MockDasboard() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const shaderContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkShaderReady = () => {
      if (shaderContainerRef.current) {
        const canvas = shaderContainerRef.current.querySelector("canvas")
        if (canvas && canvas.width > 0 && canvas.height > 0) {
          setIsLoaded(true)
          return true
        }
      }
      return false
    }

    if (checkShaderReady()) return
    const intervalId = setInterval(() => {
      if (checkShaderReady()) clearInterval(intervalId)
    }, 100)
    const fallbackTimer = setTimeout(() => setIsLoaded(true), 1500)
    return () => {
      clearInterval(intervalId)
      clearTimeout(fallbackTimer)
    }
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u))
    return () => unsub()
  }, [])

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider()
    try {
      await signInWithPopup(auth, provider)
    } catch (e: any) {
      if (e?.code !== "auth/cancelled-popup-request") console.error(e)
    }
  }

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-background">
      <CustomCursor />
      <GrainOverlay />

      <div
        ref={shaderContainerRef}
        className={`fixed inset-0 z-0 transition-opacity duration-700 ${isLoaded ? "opacity-100" : "opacity-0"}`}
        style={{ contain: "strict" }}
      >
        <Shader className="h-full w-full">
          <Swirl colorA="#1275d8" colorB="#e19136" speed={0.8} detail={0.8} blend={50} coarseX={40} coarseY={40} mediumX={40} mediumY={40} fineX={40} fineY={40} />
          <ChromaFlow baseColor="#0066ff" upColor="#0066ff" downColor="#d1d1d1" leftColor="#e19136" rightColor="#e19136" intensity={0.9} radius={1.8} momentum={25} maskType="alpha" opacity={0.97} />
        </Shader>
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <nav className={`fixed left-0 right-0 top-0 z-50 flex items-center justify-between px-6 py-6 transition-opacity duration-700 md:px-12 ${isLoaded ? "opacity-100" : "opacity-0"}`}>
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/15 backdrop-blur-md">
            <span className="font-sans text-xl font-bold text-foreground">L</span>
          </div>
          <span className="font-sans text-xl font-semibold tracking-tight text-foreground">LegalMind AI</span>
        </div>
        {user ? (
          <ProfileDropdown user={user} />
        ) : (
          <MagneticButton variant="secondary" onClick={handleSignIn}>Sign in</MagneticButton>
        )}
      </nav>

      <div className={`relative z-10 flex min-h-screen items-center justify-center px-6 pt-24 md:px-12 ${isLoaded ? "opacity-100" : "opacity-0"}`}>
        <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-white/10 p-8 text-center text-white backdrop-blur-xl">
          <h1 className="mb-3 text-3xl font-semibold">Mock Dashboard</h1>
          <p className="mb-6 text-white/80">This is a placeholder for the dashboard route. Replace this with real content later.</p>
          <div className="flex items-center justify-center gap-3">
            <MagneticButton variant="primary" onClick={() => window.location.assign("/")}>Go Home</MagneticButton>
            <MagneticButton variant="secondary" onClick={() => window.location.assign("/dashboard/demo/demo")}>Open Demo Dashboard</MagneticButton>
          </div>
        </div>
      </div>

      <style jsx global>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </main>
  )
}
