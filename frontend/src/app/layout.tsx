import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import { Users, LayoutDashboard, Terminal, Kanban, Calendar } from 'lucide-react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CRM Leads',
  description: 'Gestão operacional de leads enxuta',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={inter.className}>
        <div className="flex h-screen overflow-hidden">
          {/* Menu Lateral Fixo */}
          <aside className="w-64 border-r border-border bg-card flex flex-col p-4">
            <h1 className="text-xl font-bold mb-8">CRM Leads</h1>
            <nav className="flex-1 space-y-2">
              <Link href="/" className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-foreground/5 text-foreground/80 hover:text-foreground transition-colors font-medium">
                <Calendar size={18} />
                <span>Agenda / Hoje</span>
              </Link>
              <Link href="/kanban" className="flex items-center space-x-3 px-3 py-2 rounded-md text-foreground/70 hover:bg-foreground/5 hover:text-foreground transition-colors">
                <Kanban size={18} />
                <span>Kanban</span>
              </Link>
              <Link href="/settings" className="flex items-center space-x-3 px-3 py-2 rounded-md text-foreground/70 hover:bg-foreground/5 hover:text-foreground transition-colors">
                <Users size={18} />
                <span>Equipes & Usuários</span>
              </Link>
              <Link href="/logs" className="flex items-center space-x-3 px-3 py-2 rounded-md text-foreground/70 hover:bg-foreground/5 hover:text-foreground transition-colors">
                <Terminal size={18} />
                <span>Logs Comerciais</span>
              </Link>
            </nav>
            <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs text-foreground/45">Diretoria</span>
                <span className="text-sm font-medium text-foreground/85">Fabiano Fachini</span>
              </div>
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" title="Servidor Ativo" />
            </div>
          </aside>
          
          {/* Área Principal */}
          <main className="flex-1 overflow-y-auto bg-background p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
