import React, { type ReactNode } from 'react'
import { TopNavbar } from './TopNavbar'

export interface MainLayoutProps {
  children: ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#F5F7FB] flex flex-col font-sans text-slate-800 antialiased overflow-x-hidden w-full">
      {/* Fixed Top Navigation Only - No Left Sidebar */}
      <TopNavbar />

      {/* Main Content Area - Full width responsive grid, scrolls vertically beneath fixed navigation */}
      <main className="flex-1 pt-[66px] sm:pt-[70px] pb-6 sm:pb-8 px-3.5 sm:px-5 lg:px-6 w-full">
        {children}
      </main>

      {/* Enterprise footer */}
      <footer className="border-t border-slate-200/80 bg-white/60 py-2.5 sm:py-3 text-center text-[12px] sm:text-[13px] text-slate-500">
        <p>Commercial POS Software Architecture • Phase 1 Ready for Laravel API &amp; IndexedDB</p>
      </footer>
    </div>
  )
}

export default MainLayout
