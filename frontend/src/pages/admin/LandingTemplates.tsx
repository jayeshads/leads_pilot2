import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { FileText, Plus, Trash2, X, Code, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface Template {
  id: string
  name: string
  category: string
  industry: string
  version: string
  status: 'active' | 'draft'
  preview_url: string
  html_content?: string
}

export default function AdminLandingTemplates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)
  const [form, setForm] = useState({
    name: '',
    category: 'general',
    industry: 'General Business',
    version: 'v1.0.0',
    preview_url: '',
    html_content: '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <title>Landing Page</title>\n  <style>\n    body { font-family: sans-serif; padding: 40px; text-align: center; background: #0f172a; color: #fff; }\n    .btn { background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 16px; }\n  </style>\n</head>\n<body>\n  <h1>Your High-Converting Landing Page</h1>\n  <p>Special limited time offer for your customers!</p>\n  <a href="#" class="btn">Claim Offer Now</a>\n</body>\n</html>'
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('landing_page_templates')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      if (data) setTemplates(data as Template[])
    } catch (err) {
      console.error('Error fetching templates:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTemplate = async () => {
    if (!form.name) return
    const id = `tpl_${crypto.randomUUID().slice(0, 8)}`

    // Generate a data URL for preview if html content exists
    const previewUrl = form.preview_url || `data:text/html;charset=utf-8,${encodeURIComponent(form.html_content)}`

    const newTpl: Template = {
      id,
      name: form.name,
      category: form.category,
      industry: form.industry,
      version: form.version,
      status: 'active',
      preview_url: previewUrl,
      html_content: form.html_content
    }

    try {
      const { error } = await supabase.from('landing_page_templates').insert(newTpl)
      if (error) throw error

      setTemplates([newTpl, ...templates])
      setShowAddModal(false)
      setForm({
        name: '',
        category: 'general',
        industry: 'General Business',
        version: 'v1.0.0',
        preview_url: '',
        html_content: '<!DOCTYPE html>\n<html>\n<body>\n  <h1>Custom Landing Page</h1>\n</body>\n</html>'
      })
    } catch (err) {
      console.error('Failed to add template', err)
      alert('Failed to add template')
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      try {
        const { error } = await supabase.from('landing_page_templates').delete().eq('id', id)
        if (error) throw error
        setTemplates(prev => prev.filter(t => t.id !== id))
      } catch (err) {
        console.error('Failed to delete', err)
      }
    }
  }

  const handleToggleStatus = async (id: string) => {
    const tpl = templates.find(t => t.id === id)
    if (!tpl) return
    const newStatus = tpl.status === 'active' ? 'draft' : 'active'
    try {
      const { error } = await supabase.from('landing_page_templates').update({ status: newStatus }).eq('id', id)
      if (error) throw error
      setTemplates(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t))
    } catch (err) {
      console.error('Failed to update status', err)
    }
  }

  return (
    <>
      <Helmet><title>Landing Page Templates — Admin LeadPilot</title></Helmet>

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <FileText className="text-violet-400" />
              Landing Page Templates
            </h1>
            <p className="text-slate-400 text-sm mt-1">Upload custom HTML/CSS code templates and generate live preview links for client campaigns.</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg active:scale-95 flex-shrink-0"
          >
            <Plus size={16} /> Upload HTML Code Template
          </button>
        </div>

        {/* Featured Live Preview Section */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 text-slate-400 border border-white/5 rounded-2xl glass">
            No templates found. Click "Upload HTML Code Template" to add one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {templates.map(tpl => (
              <div key={tpl.id} className="glass rounded-2xl overflow-hidden border border-white/10 flex flex-col group hover:border-violet-500/50 transition-all shadow-xl">
                {/* Visual Preview Thumbnail Box */}
                <div className="relative h-44 bg-slate-900 overflow-hidden border-b border-white/5">
                  {tpl.preview_url && tpl.preview_url.startsWith('data:') || tpl.html_content ? (
                    <iframe
                      srcDoc={tpl.html_content}
                      className="w-full h-full pointer-events-none scale-75 transform origin-top-left w-[133%] h-[133%]"
                      title={tpl.name}
                    />
                  ) : (
                    <img src={tpl.preview_url} alt={tpl.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  )}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-semibold text-white">
                    <span className={cn('w-2 h-2 rounded-full', tpl.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400')} />
                    {tpl.status.toUpperCase()}
                  </div>
                </div>

                {/* Template Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-violet-300 transition-colors">{tpl.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{tpl.industry} · {tpl.version}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                    <button
                      onClick={() => setPreviewTemplate(tpl)}
                      className="inline-flex items-center gap-1.5 text-violet-400 hover:text-violet-300 font-semibold"
                    >
                      <Eye size={14} /> Preview Live Link
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleStatus(tpl.id)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
                          tpl.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        )}
                      >
                        {tpl.status === 'active' ? 'Active' : 'Draft'}
                      </button>
                      <button
                        onClick={() => handleDelete(tpl.id)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1"
                        title="Delete template"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Upload HTML Code Template */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-dark-900 border border-white/10 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative">
              <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                <X size={18} />
              </button>

              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Code className="text-violet-400" /> Upload HTML Code Template
                </h2>
                <p className="text-slate-400 text-xs mt-1">Paste custom HTML/CSS code to generate a new landing template for clients.</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">Template Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Modern E-commerce Landing"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-dark-800 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">Industry</label>
                    <input
                      type="text"
                      placeholder="e.g. Real Estate, Healthcare"
                      value={form.industry}
                      onChange={e => setForm({ ...form, industry: e.target.value })}
                      className="w-full bg-dark-800 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Paste HTML Code</label>
                  <textarea
                    rows={8}
                    value={form.html_content}
                    onChange={e => setForm({ ...form, html_content: e.target.value })}
                    className="w-full bg-dark-950 border border-white/10 rounded-xl p-3 text-xs font-mono text-emerald-400 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTemplate}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg"
                >
                  Publish Template
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Full Live Preview */}
        {previewTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-dark-900 border border-white/10 rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden relative">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-dark-800">
                <div>
                  <h3 className="text-base font-bold text-white">{previewTemplate.name}</h3>
                  <p className="text-xs text-slate-400">{previewTemplate.industry} · Live Preview Link</p>
                </div>
                <button onClick={() => setPreviewTemplate(null)} className="text-slate-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 bg-white">
                <iframe
                  srcDoc={previewTemplate.html_content}
                  className="w-full h-full border-none"
                  title="Full Live Preview"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
