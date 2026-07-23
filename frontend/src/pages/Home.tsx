import { useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import Hero from '@/components/home/Hero'
import ChatDemo from '@/components/home/ChatDemo'
import SocialProof from '@/components/home/SocialProof'
import Results from '@/components/home/Results'
import Capabilities from '@/components/home/Capabilities'
import Workflow from '@/components/home/Workflow'
import KnowledgeEngine from '@/components/home/KnowledgeEngine'
import DashboardPreview from '@/components/home/DashboardPreview'
import { CaseStudies, Reviews } from '@/components/home/CaseStudiesReviews'
import FAQ, { FinalCTA } from '@/components/home/FAQFinalCTA'

export default function Home() {
  const chatRef = useRef<HTMLDivElement>(null)
  const scrollToChat = () => chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <>
      <Helmet>
        <title>LeadPilot — Your AI Marketing Employee</title>
        <meta
          name="description"
          content="LeadPilot is an AI Marketing Employee that runs your Meta Ads end to end — strategy, creatives, landing pages, optimization — from one conversation."
        />
      </Helmet>

      <div className="bg-cloud-0 text-ink-900">
        <Hero onWatchDemo={scrollToChat} />
        <div ref={chatRef}>
          <ChatDemo />
        </div>
        <SocialProof />
        <Results />
        <Capabilities />
        <Workflow />
        <KnowledgeEngine />
        <DashboardPreview />
        <CaseStudies />
        <Reviews />
        <FAQ />
        <FinalCTA />
      </div>
    </>
  )
}
