import { useState, useEffect, useRef, useCallback } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FileText, Image,
  CreditCard, Settings, LogOut, Menu, X,
  Shield, Facebook, PenSquare, MessageSquare,
  Search, ChevronsUpDown, Sparkles, PanelLeft
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/AuthContext'
import { listChatSessions, type ChatSessionSummary as ChatSession } from '@/lib/aiManager'

const navItems = [
  { href: '/dashboard/monitor', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/landing-pages', label: 'Landing Pages', icon: FileText },
  { href: '/dashboard/creatives', label: 'Creatives', icon: Image },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
  { href: '/dashboard/meta-account', label: 'Meta Account', icon: Facebook },
]

interface DashboardSidebarNavProps {
  profile: any
  sessions: ChatSession[]
  toggleCollapsed: () => void
  handleResumeSession: (session: ChatSession) => void
  handleSignOut: () => void
  profileMenuOpen: boolean
  setProfileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>
  setSidebarOpen: (val: boolean) => void
  menuRef: React.RefObject<HTMLDivElement>
}

function DashboardSidebarNav({
  profile,
  sessions,
  toggleCollapsed,
  handleResumeSession,
  handleSignOut,
  profileMenuOpen,
  setProfileMenuOpen,
  setSidebarOpen,
  menuRef
}: DashboardSidebarNavProps) {
  return (
    <div className="flex flex-col h-full text-claude-textMuted">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-claude-accent rounded-md flex items-center justify-center flex-shrink-0">
            <Sparkles size={14} className="text-claude-accentText" />
          </div>
          <span className="font-semibold text-claude-text text-sm">LeadPilot</span>
        </div>
        <button
          onClick={toggleCollapsed}
          className="hidden md:flex text-claude-textMuted hover:text-claude-text w-6 h-6 items-center justify-center rounded-md hover:bg-claude-sidebarHover"
          title="Collapse sidebar"
        >
          <PanelLeft size={15} />
        </button>
      </div>

      {/* New chat */}
      <div className="px-3 mb-2">
        <NavLink
          to="/dashboard"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-claude-accentText bg-claude-sidebarActive hover:bg-claude-sidebarHover transition-colors border border-claude-sidebarBorder"
        >
          <PenSquare size={15} />
          New chat
        </NavLink>
      </div>

      {/* Feature nav (search-like row) */}
      <div className="px-3 mb-1">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-claude-textMuted hover:bg-claude-sidebarHover hover:text-claude-text transition-colors cursor-pointer">
          <Search size={15} />
          Search chats
        </div>
      </div>

      {/* Scroll area: recents + workspace nav */}
      <nav className="flex-1 px-3 py-2 space-y-5 overflow-y-auto">
        {/* Recent chats — Claude-style history list */}
        <div>
          <p className="text-[11px] font-medium text-claude-textMuted/70 uppercase tracking-wider px-3 mb-1.5">Chats</p>
          {sessions.length === 0 ? (
            <p className="px-3 text-xs text-claude-textMuted/60">No previous chats yet</p>
          ) : (
            <ul className="space-y-0.5">
              {sessions.slice(0, 12).map(s => (
                <li key={s.id}>
                  <button
                    onClick={() => handleResumeSession(s)}
                    className="w-full text-left flex flex-col px-3 py-1.5 rounded-lg text-[13px] text-claude-textMuted hover:bg-claude-sidebarHover hover:text-claude-text transition-colors truncate"
                    title={s.title}
                  >
                    <span className="truncate">{s.title || 'Untitled chat'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* App workspace nav */}
        <div>
          <p className="text-[11px] font-medium text-claude-textMuted/70 uppercase tracking-wider px-3 mb-1.5">Workspace</p>
          <ul className="space-y-0.5">
            {navItems.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <NavLink
                  to={href}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => cn(
                    'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] transition-colors',
                    isActive
                      ? 'bg-claude-sidebarActive text-claude-accentText'
                      : 'text-claude-textMuted hover:bg-claude-sidebarHover hover:text-claude-text'
                  )}
                >
                  <Icon size={14} />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Admin link */}
        {profile?.role === 'admin' && (
          <div>
            <p className="text-[11px] font-medium text-claude-textMuted/70 uppercase tracking-wider px-3 mb-1.5">Admin</p>
            <NavLink
              to="/admin"
              className={({ isActive }) => cn(
                'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] transition-colors',
                isActive
                  ? 'bg-claude-sidebarActive text-claude-accentText'
                  : 'text-claude-textMuted hover:bg-claude-sidebarHover hover:text-claude-text'
              )}
            >
              <Shield size={14} />
              Admin Panel
            </NavLink>
          </div>
        )}
      </nav>

      {/* Bottom-left settings / profile menu — Claude style */}
      <div className="border-t border-claude-sidebarBorder p-2 relative" ref={menuRef}>
        {profileMenuOpen && (
          <div className="absolute bottom-full left-2 right-2 mb-1 bg-white border border-claude-border rounded-xl shadow-lg overflow-hidden py-1">
            <NavLink
              to="/dashboard/settings"
              onClick={() => setProfileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-claude-textMuted hover:bg-claude-sidebarHover hover:text-claude-text transition-colors"
            >
              <Settings size={14} />
              Settings
            </NavLink>
            <div className="h-px bg-claude-sidebarBorder my-1" />
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-claude-textMuted hover:bg-claude-sidebarHover hover:text-claude-text transition-colors"
            >
              <LogOut size={14} />
              Log out
            </button>
          </div>
        )}

        <button
          onClick={() => setProfileMenuOpen(v => !v)}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-claude-sidebarHover transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-claude-accent flex items-center justify-center text-claude-accentText text-xs font-semibold flex-shrink-0">
            {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[13px] text-claude-text font-medium truncate">{profile?.full_name ?? 'User'}</p>
          </div>
          <ChevronsUpDown size={13} className="text-claude-textMuted/70 flex-shrink-0" />
        </button>
      </div>
    </div>
  )
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('leadpilot_sidebar_collapsed') === '1')
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const menuRef = useRef<HTMLDivElement>(null)

  const loadSessions = useCallback(async () => {
    if (!profile?.id) return
    try {
      const list = await listChatSessions()
      setSessions(list)
    } catch (e) {
      // Sidebar staying stale is better than the whole dashboard crashing
      // if this one call fails (e.g. a transient network blip).
      console.error('Failed to load chat sessions for sidebar:', e)
    }
  }, [profile?.id])

  useEffect(() => {
    loadSessions()
    window.addEventListener('focus', loadSessions)
    return () => window.removeEventListener('focus', loadSessions)
  }, [loadSessions, location])

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      localStorage.setItem('leadpilot_sidebar_collapsed', prev ? '0' : '1')
      return !prev
    })
  }

  const handleResumeSession = (session: ChatSession) => {
    navigate(`/dashboard?session=${session.id}`)
    setSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-claude-bg flex">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col bg-claude-sidebar border-r border-claude-sidebarBorder fixed inset-y-0 left-0 z-30 transition-all duration-200 overflow-hidden',
          collapsed ? 'w-0 border-r-0' : 'w-64'
        )}
      >
        <div className="w-64 h-full flex-shrink-0">
          <DashboardSidebarNav
            profile={profile}
            sessions={sessions}
            toggleCollapsed={toggleCollapsed}
            handleResumeSession={handleResumeSession}
            handleSignOut={handleSignOut}
            profileMenuOpen={profileMenuOpen}
            setProfileMenuOpen={setProfileMenuOpen}
            setSidebarOpen={setSidebarOpen}
            menuRef={menuRef}
          />
        </div>
      </aside>

      {/* Floating expand button when sidebar is collapsed */}
      {collapsed && (
        <button
          onClick={toggleCollapsed}
          className="hidden md:flex fixed top-4 left-4 z-30 w-8 h-8 items-center justify-center rounded-lg border border-claude-border bg-white text-claude-textMuted hover:text-claude-text shadow-sm"
          title="Expand sidebar"
        >
          <PanelLeft size={15} />
        </button>
      )}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-72 bg-claude-sidebar border-r border-claude-sidebarBorder z-50">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-claude-textMuted hover:text-claude-text"
            >
              <X size={20} />
            </button>
            <DashboardSidebarNav
              profile={profile}
              sessions={sessions}
              toggleCollapsed={toggleCollapsed}
              handleResumeSession={handleResumeSession}
              handleSignOut={handleSignOut}
              profileMenuOpen={profileMenuOpen}
              setProfileMenuOpen={setProfileMenuOpen}
              setSidebarOpen={setSidebarOpen}
              menuRef={menuRef}
            />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className={cn('flex-1 flex flex-col min-h-screen transition-all duration-200', collapsed ? 'md:ml-0' : 'md:ml-64')}>
        {/* Topbar — minimal, Claude-style (only shown on non-chat pages / mobile) */}
        <header className="md:hidden sticky top-0 z-20 flex items-center gap-4 px-4 h-14 border-b border-claude-border bg-claude-bg">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-claude-textMuted hover:text-claude-text"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-semibold text-claude-text flex items-center gap-1.5">
            <MessageSquare size={15} className="text-claude-accent" />
            LeadPilot
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
