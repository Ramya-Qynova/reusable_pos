import React, { useState, useRef, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  ShoppingCart,
  Bell,
  WifiOff,
  Menu,
  X,
  UserCheck,
  ShieldAlert,
} from 'lucide-react'
import { NAVIGATION_ITEMS } from '../../config/navigation'
import { useOffline } from '../../context/OfflineContext'
import { useNotification } from '../../context/NotificationContext'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../utils/cn'

export const TopNavbar: React.FC = () => {
  const { isOnline, setSimulatedOffline } = useOffline()
  const { showNotification } = useNotification()
  const { user, activeRole, switchDemoRole, logout } = useAuth()
  const location = useLocation()

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(1)

  const userMenuRef = useRef<HTMLDivElement>(null)

  // Close user menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNotificationClick = () => {
    setUnreadNotifications(0)
    showNotification({
      title: 'Notifications Reviewed',
      message: 'All system notifications marked as reviewed.',
      type: 'info',
    })
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-[#D45060] text-white shadow-md select-none w-full overflow-x-hidden">
      <div className="w-full px-3.5 sm:px-5 lg:px-6">
        <div className="flex items-center justify-between h-14 gap-2">
          {/* Left: POS Logo Only */}
          <div className="flex items-center shrink-0">
            <NavLink
              to="/"
              className="flex items-center gap-2 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-lg"
              aria-label="POS Home"
            >
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white shadow-inner group-hover:bg-white/25 transition-all">
                <ShoppingCart className="w-4.5 h-4.5" />
              </div>
              <span className="text-lg font-black tracking-tight text-white drop-shadow-xs">
                POS
              </span>
            </NavLink>
          </div>

          {/* Center: 8 Main Navigation Modules (Desktop lg+) */}
          <nav
            className="hidden lg:flex items-center justify-center flex-1 mx-2 xl:mx-4 min-w-0"
            aria-label="Main Navigation"
          >
            <div className="flex items-center gap-1 xl:gap-1.5 2xl:gap-2 justify-center">
              {NAVIGATION_ITEMS.map((item) => {
                const isActive =
                  item.path === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.path)

                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-1.5 px-2 xl:px-2.5 2xl:px-3 py-1.5 rounded-lg text-[12px] xl:text-[13px] 2xl:text-[13.5px] font-medium leading-normal whitespace-nowrap transition-all duration-150',
                      isActive
                        ? 'bg-white/25 text-white font-semibold shadow-xs ring-1 ring-white/30'
                        : 'text-white/85 hover:text-white hover:bg-white/10'
                    )}
                  >
                    <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                      {item.icon({ className: 'w-4 h-4' })}
                    </span>
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          </nav>

          {/* Right: Minimal Utility Icons (Status, Bell, Profile, Mobile Menu) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* 1. Small Online/Offline status indicator (no text) */}
            <button
              type="button"
              onClick={() => setSimulatedOffline(isOnline)}
              title={
                isOnline
                  ? 'System Online (Click to simulate offline mode)'
                  : 'System Offline (Click to simulate online mode)'
              }
              aria-label={isOnline ? 'System Online' : 'System Offline'}
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer shrink-0',
                isOnline
                  ? 'bg-white/10 border-white/20 hover:bg-white/20 text-white'
                  : 'bg-amber-500/25 border-amber-300/40 hover:bg-amber-500/35 text-amber-200'
              )}
            >
              {isOnline ? (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                </span>
              ) : (
                <WifiOff className="w-4 h-4 text-amber-300" />
              )}
            </button>

            {/* 2. Notification bell icon (no text) */}
            <button
              type="button"
              onClick={handleNotificationClick}
              title="System Notifications"
              aria-label="System notifications"
              className="relative w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-all cursor-pointer shrink-0"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-3.5 h-3.5 px-0.5 rounded-full bg-white text-[#D45060] font-bold text-[9px] shadow-xs">
                  {unreadNotifications}
                </span>
              )}
            </button>

            {/* 3. Admin profile/avatar icon with Role Switcher */}
            <div ref={userMenuRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                title={user ? `${user.name} (${activeRole.toUpperCase()})` : 'User Profile'}
                aria-label="User profile menu"
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 border border-white/40 flex items-center justify-center text-white font-bold text-xs transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                {activeRole === 'admin' ? 'AD' : 'CS'}
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white text-slate-800 shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-bold text-slate-800">{user?.name || (activeRole === 'admin' ? 'Admin User' : 'Cashier')}</p>
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase',
                        activeRole === 'admin' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      )}>
                        {activeRole === 'admin' ? 'Super Admin' : 'Cashier'}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-slate-500 truncate">{user?.email || (activeRole === 'admin' ? 'admin@greenmart.pos' : 'cashier@greenmart.pos')}</p>
                  </div>

                  {/* Role Switcher for Phase 2 Permission Testing */}
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-600 mb-1.5">Quick Switch Role (Testing)</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={async () => {
                          await switchDemoRole('admin')
                          setIsUserMenuOpen(false)
                          showNotification({
                            title: 'Active Role: Admin',
                            message: 'Switched to Super Admin (Full Catalog Access).',
                            type: 'success',
                          })
                        }}
                        className={cn(
                          'flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-all',
                          activeRole === 'admin'
                            ? 'bg-[#D45060] text-white border-[#D45060]'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        )}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Admin</span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await switchDemoRole('cashier')
                          setIsUserMenuOpen(false)
                          showNotification({
                            title: 'Active Role: Cashier',
                            message: 'Switched to Cashier (View Only, Catalog mutations blocked).',
                            type: 'warning',
                          })
                        }}
                        className={cn(
                          'flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-all',
                          activeRole === 'cashier'
                            ? 'bg-[#D45060] text-white border-[#D45060]'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        )}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Cashier</span>
                      </button>
                    </div>
                  </div>

                  <NavLink
                    to="/settings"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="block px-3.5 py-2 text-[13px] text-slate-700 hover:bg-slate-50 hover:text-[#D45060] transition-colors"
                  >
                    Settings
                  </NavLink>
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        logout()
                        setIsUserMenuOpen(false)
                        showNotification({
                          title: 'Signed Out',
                          message: 'Session cleared.',
                          type: 'info',
                        })
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-[13px] text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Responsive Compact Menu Button (< lg screens) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-all cursor-pointer shrink-0"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Compact Menu on smaller screens (< lg) - No horizontal scrolling */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-white/20 bg-[#C03E4E] px-4 py-3 max-h-[85vh] overflow-y-auto animate-in slide-in-from-top-2 shadow-xl">
          <div className="grid grid-cols-2 gap-2">
            {NAVIGATION_ITEMS.map((item) => {
              const isActive =
                item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path)

              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-2 p-2.5 rounded-lg text-[13px] font-medium transition-colors',
                    isActive
                      ? 'bg-white text-[#D45060] font-bold shadow-xs'
                      : 'text-white hover:bg-white/15'
                  )}
                >
                  <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                    {item.icon({ className: 'w-4 h-4' })}
                  </span>
                  <span className="truncate">{item.label}</span>
                </NavLink>
              )
            })}
          </div>
        </div>
      )}
    </header>
  )
}

export default TopNavbar
