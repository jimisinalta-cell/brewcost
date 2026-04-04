"use client";

import { useState } from "react";

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-md text-brew-600 hover:bg-brew-100 transition-colors"
        aria-label="Toggle menu"
      >
        {open ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute top-14 left-0 right-0 bg-white border-b border-brew-200 shadow-lg z-50">
          <div className="flex flex-col px-4 py-2">
            <a
              href="/"
              onClick={() => setOpen(false)}
              className="py-3 text-sm font-medium text-brew-600 hover:text-brew-900 border-b border-brew-100"
            >
              Dashboard
            </a>
            <a
              href="/ingredients"
              onClick={() => setOpen(false)}
              className="py-3 text-sm font-medium text-brew-600 hover:text-brew-900 border-b border-brew-100"
            >
              Ingredients
            </a>
            <a
              href="/recipes/new"
              onClick={() => setOpen(false)}
              className="py-3 text-sm font-medium text-brew-600 hover:text-brew-900 border-b border-brew-100"
            >
              New Recipe
            </a>
            <a
              href="/contact"
              onClick={() => setOpen(false)}
              className="py-3 text-sm font-medium text-brew-600 hover:text-brew-900 border-b border-brew-100"
            >
              Contact
            </a>
            <a
              href="/account"
              onClick={() => setOpen(false)}
              className="py-3 text-sm font-medium text-brew-600 hover:text-brew-900"
            >
              Account
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
