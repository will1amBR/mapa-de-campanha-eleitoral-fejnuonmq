import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  MapPin,
  Users,
  Compass,
  PieChart,
  Bot,
  Settings,
  LogOut,
  Radio,
  ChevronDown,
  Building2,
  TrendingUp,
  Calendar,
  BarChart3,
  UserCheck,
  Menu,
  X,
  Trophy,
  Swords,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useCampaign } from '@/hooks/use-campaign'
import { useGpsTracker } from '@/hooks/use-gps-tracker'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface LayoutProps {
  children: React.ReactNode
}

export const DashboardLayout: React.FC<LayoutProps> = ({ children }) => {
  const { user, signOut } = useAuth()
  const { campaigns, currentCampaign, setCurrentCampaign } = useCampaign()
  const { isTracking, startTracking, stopTracking } = useGpsTracker()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  interface NavItem {
    to: string
    label: string
    icon: React.ComponentType<{ className?: string }>
    badge?: string
    highlight?: boolean
    roles?: string[]
  }

  interface NavGroup {
    title: string
    subtitle: string
    items: NavItem[]
  }

  const navGroups: NavGroup[] = [
    {
      title: '01 APOIADORES',
      subtitle: 'Cadastro, indicação e relacionamento',
      items: [
        { to: '/dashboard', label: 'Captação & Métricas', icon: LayoutDashboard, badge: 'Aba 07' },
        { to: '/debate-prep', label: 'Preparação de Debate', icon: Swords, badge: 'Q&A' },
        { to: '/candidates', label: 'Candidaturas SP (TSE)', icon: Users, badge: 'TSE' },
        { to: '/support-points', label: 'Comitês & Apoio', icon: Building2, badge: 'Aba 05' },
      ],
    },
    {
      title: '02 EQUIPES',
      subtitle: 'Responsáveis, membros e atividades',
      items: [
        { to: '/team', label: 'Equipes & Atividades', icon: Users, badge: 'Aba 08' },
        {
          to: '/ranking',
          label: 'Ranking & Gamificação',
          icon: Trophy,
          badge: 'Top 3',
        },
        {
          to: '/team-performance',
          label: 'Desempenho & GPS',
          icon: TrendingUp,
          badge: 'Coord',
          roles: ['admin', 'coordinator'],
        },
      ],
    },
    {
      title: '03 CAMPO',
      subtitle: 'Rastreamento, trajetos e cobertura',
      items: [
        { to: '/map', label: 'Mapa Geral & Ao Vivo', icon: MapPin, badge: 'Aba 01/03' },
        {
          to: '/campaign-tracking',
          label: 'Cobertura & UTM Tracking',
          icon: BarChart3,
          badge: 'Aba 04',
        },
        { to: '/content-calendar', label: 'Calendário de Redes', icon: Calendar, badge: 'Digital' },
      ],
    },
    {
      title: '04 TERRITÓRIO',
      subtitle: 'Setores, pontos e leitura geográfica',
      items: [
        { to: '/analysis', label: 'Setores & Polígonos', icon: PieChart, badge: 'Aba 09' },
        { to: '/ai-consultant', label: 'Estrategista IA', icon: Bot, highlight: true },
        { to: '/settings', label: 'Configurações', icon: Settings },
      ],
    },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 w-full max-w-full overflow-x-hidden">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full h-14 sm:h-16 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between px-2.5 sm:px-6 shadow-md">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 mr-2">
          <button
            type="button"
            className="md:hidden p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 shrink-0"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu de Navegação"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div
            className="flex items-center gap-1.5 sm:gap-2 cursor-pointer min-w-0"
            onClick={() => navigate('/dashboard')}
          >
            <div className="w-7 sm:w-9 h-7 sm:h-9 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Compass className="w-4 sm:w-5 h-4 sm:h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-xs sm:text-base tracking-tight text-white flex items-center gap-1 leading-none truncate">
                Estrategista{' '}
                <span className="text-amber-400 font-semibold hidden sm:inline">Eleitoral</span>
              </span>
              <span className="text-[8px] sm:text-[10px] text-slate-400 hidden sm:block font-medium truncate mt-0.5">
                Inteligência TSE/IBGE
              </span>
            </div>
          </div>
        </div>

        {/* Campaign Switcher Dropdown & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {campaigns.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-slate-800/90 border-slate-700 text-slate-100 hover:bg-slate-800 hover:text-white text-xs font-medium h-7 sm:h-9 max-w-[125px] xs:max-w-[150px] sm:max-w-[240px] justify-between shadow-sm px-2 sm:px-3"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: currentCampaign?.color || '#F59E0B' }}
                    />
                    <span className="truncate text-[11px] sm:text-xs">
                      {currentCampaign?.name || 'Campanha'}
                    </span>
                  </div>
                  <ChevronDown className="w-3 h-3 ml-0.5 sm:ml-1 opacity-60 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 bg-slate-900 border-slate-800 text-slate-100 p-1 z-50"
              >
                <DropdownMenuLabel className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider px-2 py-1.5">
                  Campanhas Ativas
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-800" />
                {campaigns.map((camp) => (
                  <DropdownMenuItem
                    key={camp.id}
                    onClick={() => setCurrentCampaign(camp)}
                    className={`flex items-center justify-between text-xs px-2.5 py-2 rounded-md cursor-pointer ${
                      currentCampaign?.id === camp.id
                        ? 'bg-amber-500/20 text-amber-300 font-semibold'
                        : 'hover:bg-slate-800'
                    }`}
                  >
                    <div className="truncate">
                      <div className="font-medium text-slate-100 truncate">{camp.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {camp.candidate_name} • {camp.party}
                      </div>
                    </div>
                    {currentCampaign?.id === camp.id && (
                      <Badge className="bg-amber-500 text-slate-950 text-[10px] font-bold h-4 px-1">
                        Ativo
                      </Badge>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Live GPS Connectivity Pill */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={isTracking ? stopTracking : startTracking}
                className={`hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full font-medium transition-all duration-300 ${
                  isTracking
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
                }`}
              >
                <span className="relative flex h-2 w-2">
                  {isTracking && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${isTracking ? 'bg-emerald-500' : 'bg-slate-500'}`}
                  ></span>
                </span>
                <Radio className="w-3 h-3" />
                <span>{isTracking ? 'GPS Ativo' : 'GPS Parado'}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {isTracking
                ? 'Rastreamento em tempo real ativo. Clique para pausar.'
                : 'Clique para ativar a transmissão de GPS.'}
            </TooltipContent>
          </Tooltip>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 p-0 shrink-0"
              >
                <span className="font-bold text-xs uppercase">
                  {user?.name ? user.name.charAt(0) : user?.email ? user.email.charAt(0) : 'U'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-slate-900 border-slate-800 text-slate-100 z-50"
            >
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-xs font-semibold text-slate-100 leading-none">
                    {user?.name || 'Membro da Campanha'}
                  </p>
                  <p className="text-[11px] leading-none text-slate-400 truncate">{user?.email}</p>
                  <div className="pt-1">
                    <Badge
                      variant="outline"
                      className="text-[10px] border-slate-700 text-amber-400 bg-amber-950/40"
                    >
                      {user?.role === 'admin'
                        ? 'Coordenador Geral'
                        : user?.role === 'coordinator'
                          ? 'Coordenador Zonal'
                          : 'Militante de Campo'}
                    </Badge>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-800" />
              <DropdownMenuItem
                onClick={() => navigate('/settings')}
                className="text-xs hover:bg-slate-800 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 mr-2 text-slate-400" />
                Configurações da Conta
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate('/ai-consultant')}
                className="text-xs hover:bg-slate-800 cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5 mr-2 text-amber-400" />
                Consultor Estratégico IA
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-800" />
              <DropdownMenuItem
                onClick={() => {
                  signOut()
                  navigate('/login')
                }}
                className="text-xs text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 mr-2" />
                Sair da Plataforma
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden min-w-0 w-full">
        {' '}
        {/* Desktop Collapsible Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 text-slate-300 shrink-0 select-none">
          {/* Campaign summary card */}
          {currentCampaign && (
            <div className="p-4 mx-3 mt-4 rounded-xl bg-slate-800/60 border border-slate-800 backdrop-blur-sm">
              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                Candidatura Atual
              </div>
              <div className="font-bold text-white text-sm truncate">
                {currentCampaign.candidate_name}
              </div>
              <div className="text-xs text-slate-400 flex items-center justify-between mt-1">
                <span>{currentCampaign.party}</span>
                <span className="font-semibold text-emerald-400 text-[11px]">
                  Meta: {(currentCampaign.target_votes || 0).toLocaleString('pt-BR')} v.
                </span>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto custom-scrollbar">
            {navGroups.map((group, gIdx) => {
              const visibleItems = group.items.filter(
                (item) => !item.roles || (user?.role && item.roles.includes(user.role)),
              )
              if (visibleItems.length === 0) return null

              return (
                <div key={gIdx} className="space-y-1">
                  <div className="px-2 pt-1">
                    <div className="text-[10px] font-black tracking-wider text-amber-400/90 flex items-center justify-between uppercase">
                      <span>{group.title}</span>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    {visibleItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all group ${
                              isActive
                                ? item.highlight
                                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                                  : 'bg-slate-800/90 text-white border-l-2 border-amber-500 font-bold'
                                : item.highlight
                                  ? 'text-amber-300 hover:bg-amber-500/10 hover:text-amber-200'
                                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                            }`
                          }
                        >
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                              item.highlight
                                ? 'text-current'
                                : 'text-slate-400 group-hover:text-white'
                            }`}
                          />
                          <span className="truncate flex-1 text-left">{item.label}</span>
                          {item.highlight && (
                            <Badge className="bg-amber-400 text-slate-950 text-[9px] font-extrabold px-1.5 py-0 h-4 uppercase shrink-0">
                              IA
                            </Badge>
                          )}
                          {item.badge && !item.highlight && (
                            <span className="text-[9px] font-medium text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/60 shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </NavLink>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </nav>

          {/* Bottom GPS Quick Action */}
          <div className="p-3 border-t border-slate-800/80">
            <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 font-medium">Transmissão GPS</span>
                <span
                  className={`text-[10px] font-bold ${isTracking ? 'text-emerald-400' : 'text-slate-400'}`}
                >
                  {isTracking ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <Button
                size="sm"
                onClick={isTracking ? stopTracking : startTracking}
                className={`w-full text-xs font-semibold h-8 ${
                  isTracking
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {isTracking ? 'Interromper GPS' : 'Iniciar GPS de Campo'}
              </Button>
            </div>
          </div>
        </aside>
        {/* Mobile menu modal/drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm md:hidden flex flex-col">
            <div className="w-4/5 max-w-xs h-full bg-slate-900 border-r border-slate-800 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="font-bold text-white text-sm">Menu Estrategista</div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="mt-4 space-y-4 overflow-y-auto max-h-[70vh]">
                  {navGroups.map((group, idx) => {
                    const visibleItems = group.items.filter(
                      (item) => !item.roles || (user?.role && item.roles.includes(user.role)),
                    )
                    if (visibleItems.length === 0) return null
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="text-[10px] font-black text-amber-400 px-2 uppercase">
                          {group.title}
                        </div>
                        {visibleItems.map((item) => {
                          const Icon = item.icon
                          return (
                            <NavLink
                              key={item.to}
                              to={item.to}
                              onClick={() => setMobileMenuOpen(false)}
                              className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold ${
                                  isActive
                                    ? 'bg-amber-500 text-slate-950 font-bold'
                                    : 'text-slate-300 hover:bg-slate-800'
                                }`
                              }
                            >
                              <Icon className="w-4 h-4 shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </NavLink>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    signOut()
                    navigate('/login')
                  }}
                >
                  <LogOut className="w-3.5 h-3.5 mr-2" /> Sair
                </Button>
              </div>
            </div>
          </div>
        )}
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden min-w-0 w-full max-w-full pb-16 md:pb-0">
          {children}
        </main>
      </div>

      {/* PWA Mobile Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 border-t border-slate-800 backdrop-blur-md px-3 py-1.5 flex items-center justify-around text-slate-400">
        <NavLink
          to="/team"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-semibold ${
              isActive ? 'text-amber-400' : 'text-slate-400'
            }`
          }
        >
          <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <span>Check-in</span>
        </NavLink>

        <button
          onClick={isTracking ? stopTracking : startTracking}
          className="flex flex-col items-center gap-1 py-1 px-3 text-[10px] font-semibold"
        >
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center shadow-md ${
              isTracking
                ? 'bg-emerald-500 text-slate-950 animate-pulse'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            <Radio className="w-4 h-4" />
          </div>
          <span className={isTracking ? 'text-emerald-400' : 'text-slate-400'}>
            {isTracking ? 'GPS On' : 'GPS Off'}
          </span>
        </button>

        <NavLink
          to="/map"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-semibold ${
              isActive ? 'text-amber-400' : 'text-slate-400'
            }`
          }
        >
          <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center">
            <MapPin className="w-4 h-4" />
          </div>
          <span>Mapa</span>
        </NavLink>

        <NavLink
          to="/ai-consultant"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-semibold ${
              isActive ? 'text-amber-400' : 'text-slate-400'
            }`
          }
        >
          <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
            <Bot className="w-4 h-4" />
          </div>
          <span>IA</span>
        </NavLink>
      </div>
    </div>
  )
}
