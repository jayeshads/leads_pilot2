import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider } from '@/lib/AuthContext'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ProtectedRoute from '@/components/ProtectedRoute'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import AdminLayout from '@/components/admin/AdminLayout'

// Public pages
import Home from '@/pages/Home'
import HowItWorks from '@/pages/HowItWorks'
import Pricing from '@/pages/Pricing'
import CaseStudies from '@/pages/CaseStudies'
import Blog from '@/pages/Blog'
import About from '@/pages/About'
import Contact from '@/pages/Contact'

// Auth pages
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'

// Dashboard pages
import DashboardOverview from '@/pages/dashboard/Overview'
import Campaigns from '@/pages/dashboard/Campaigns'
import LandingPages from '@/pages/dashboard/LandingPages'
import Creatives from '@/pages/dashboard/Creatives'
import Billing from '@/pages/dashboard/Billing'
import Settings from '@/pages/dashboard/Settings'
import AiChat from '@/pages/dashboard/AiChat'
import MetaAccount from '@/pages/dashboard/MetaAccount'
import Connect from '@/pages/dashboard/Connect'

// Admin pages
import AdminOverview from '@/pages/admin/Overview'
import AdminUsers from '@/pages/admin/Users'
import AdminBilling from '@/pages/admin/Billing'
import AdminSupport from '@/pages/admin/Support'
import AdminLandingTemplates from '@/pages/admin/LandingTemplates'
import AdminPlans from '@/pages/admin/Plans'
import AdminSettings from '@/pages/admin/Settings'
import AdminMetaConfig from '@/pages/admin/MetaConfig'
import AdminKnowledgeBase from '@/pages/admin/KnowledgeBase'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

const AUTH_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password']
const DASH_PATHS = ['/dashboard', '/admin']

function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const isAuth = AUTH_PATHS.some(p => pathname.startsWith(p))
  const isDash = DASH_PATHS.some(p => pathname.startsWith(p))
  const isHome = pathname === '/'
  if (isAuth || isDash) return <>{children}</>
  if (isHome) {
    // The redesigned home page owns its own white/sky-blue background —
    // Navbar/Footer switch to a matching light variant here only. Every
    // other marketing page (How it works, Pricing, etc.) is untouched and
    // keeps the existing dark theme below.
    return (
      <div className="min-h-screen bg-cloud-0">
        <Navbar light />
        <main>{children}</main>
        <Footer light />
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-dark-950 noise">
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <Layout>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/case-studies" element={<CaseStudies />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Dashboard */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<AiChat />} />
            <Route path="connect" element={<Connect />} />
            <Route path="monitor" element={<DashboardOverview />} />
            <Route path="meta-account" element={<MetaAccount />} />
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="landing-pages" element={<LandingPages />} />
            <Route path="creatives" element={<Creatives />} />
            <Route path="billing" element={<Billing />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="billing" element={<AdminBilling />} />
            <Route path="support" element={<AdminSupport />} />
            <Route path="landing-templates" element={<AdminLandingTemplates />} />
            <Route path="plans" element={<AdminPlans />} />
            <Route path="meta-config" element={<AdminMetaConfig />} />
            <Route path="knowledge" element={<AdminKnowledgeBase />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Routes>
      </Layout>
    </AuthProvider>
  )
}
