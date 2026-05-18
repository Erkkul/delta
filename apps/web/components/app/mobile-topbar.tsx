"use client"

import { useEffect, useState } from "react"

import { AppSidebar, type AppSidebarUser } from "./app-sidebar"

import { type AppSidebarConfig } from "@/lib/navigation/producer-nav"

/**
 * Top bar sticky visible uniquement < tablet (768 px). Bouton burger
 * qui ouvre un drawer modale contenant la sidebar producteur.
 *
 * Pattern volontairement simple (state local + overlay) — pas de lib
 * de modale ajoutée au MVP. Le drawer se ferme sur clic overlay,
 * touche Escape, ou navigation vers un autre item.
 */
export function MobileTopbar({
  config,
  user,
}: {
  config: AppSidebarConfig
  user: AppSidebarUser
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [open])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-cream-200 bg-white px-4 py-3 tablet:hidden">
        <button
          type="button"
          aria-label="Ouvrir le menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="grid h-9 w-9 place-items-center rounded-md text-cream-700 hover:bg-green-50"
        >
          <svg
            viewBox="0 0 24 24"
            width={22}
            height={22}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div
            aria-hidden="true"
            className="grid h-7 w-7 place-items-center rounded bg-green-800 text-sm"
          >
            🐜
          </div>
          <div className="font-display text-base font-bold text-green-800">
            Delta<span className="text-earth-500">.</span>
          </div>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex tablet:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-cream-950/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 flex w-[280px] max-w-[80vw] shrink-0 flex-col bg-white shadow-elevated">
            <div className="flex items-center justify-between border-b border-cream-100 px-4 py-3">
              <span className="text-sm font-semibold text-cream-700">Menu</span>
              <button
                type="button"
                aria-label="Fermer le menu"
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-md text-cream-600 hover:bg-cream-100"
              >
                <svg
                  viewBox="0 0 24 24"
                  width={18}
                  height={18}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto" onClick={() => setOpen(false)}>
              <AppSidebar config={config} user={user} variant="drawer" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
