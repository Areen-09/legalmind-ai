"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { useOnClickOutside } from "@/hooks/use-on-click-outside"

interface ProfileDropdownProps {
  user: {
    photoURL?: string | null
    displayName?: string | null
    email?: string | null
  }
}

export function ProfileDropdown({ user }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useOnClickOutside(dropdownRef, () => setIsOpen(false))

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      router.push("/") // Redirect to home page after sign out
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-lg transition-all duration-300 hover:scale-110 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="User" className="h-8 w-8 rounded-full" />
        ) : (
          <span className="font-sans text-xl font-bold text-white">
            {user.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-56 origin-top-right rounded-lg bg-black/20 p-2 shadow-lg backdrop-blur-xl ring-1 ring-white/10"
          >
            <div className="p-2">
              <p className="text-sm font-medium text-white truncate">{user.displayName}</p>
              <p className="text-xs text-white/60 truncate">{user.email}</p>
            </div>
            <div className="my-2 h-px bg-white/10" />
            <div className="py-1">
              <Link
                href="/profile"
                className="block px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white rounded-md"
              >
                Profile
              </Link>
              <Link
                href="/history"
                className="block px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white rounded-md"
              >
                History
              </Link>
              <button
                onClick={handleSignOut}
                className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-600/25 hover:text-white rounded-md"
              >
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
