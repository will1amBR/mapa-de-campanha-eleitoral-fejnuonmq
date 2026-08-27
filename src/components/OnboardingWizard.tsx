import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Compass,
  Award,
  Users,
  MapPin,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Building2,
  PieChart,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface OnboardingWizardProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [step, setStep] = useState(1)
  const navigate = useNavigate()

  const totalSteps = 4

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      onComplete()
      onClose()
    }
  }

  const handlePrev = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleJumpToSection = (path: string) => {
    onComplete()
    onClose()
    navigate(path)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-slate-900 border border-slate-800 text-white shadow-2xl">
        {/* Top Progress bar */}
        <div className="h-1.5 w-full bg-slate-800">
          <div
            className="h-full bg-amber-500 transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
                <Compass className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Tour Inicial do Coordenador
              </span>
            </div>
            <Badge variant="outline" className="text-xs border-slate-700 text-slate-300">
              Passo {step} de {totalSteps}
            </Badge>
          </div>

          {/* Step 1: Welcome & Overview */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <Badge className="bg-amber-500 text-slate-950 font-black text-[10px] uppercase">
                  Bem-vindo à Central
                </Badge>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Transforme dados de campo em visão operacional
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  O <strong>Estrategista Eleitoral</strong> foi desenhado para organizar a campanha
                  em 4 pilares essenciais: <strong>Apoiadores</strong>, <strong>Equipes</strong>,{' '}
                  <strong>Campo</strong> e <strong>Território</strong>.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs space-y-1">
                  <div className="font-bold text-amber-400 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px]">
                      01
                    </span>
                    Apoiadores
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Captação com QR Code, indicação e candidatos do TSE.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs space-y-1">
                  <div className="font-bold text-amber-400 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px]">
                      02
                    </span>
                    Equipes
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Responsáveis, voluntários e planejamento de ações de rua.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs space-y-1">
                  <div className="font-bold text-amber-400 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px]">
                      03
                    </span>
                    Campo
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Rastreamento GPS ao vivo, rotas e taxa de conversão.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs space-y-1">
                  <div className="font-bold text-amber-400 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px]">
                      04
                    </span>
                    Território
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Setores do rascunho à publicação e inteligência IBGE.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Candidatos TSE & Campanha */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <Badge className="bg-amber-500 text-slate-950 font-black text-[10px] uppercase">
                  Pilar 01 • Apoiadores & Candidatos
                </Badge>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Vincule Candidaturas Oficiais do TSE (SP)
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  A plataforma já vem integrada com a base oficial de candidatos de São Paulo.
                  Selecione os candidatos apoiados pela sua coligação ou chapa para rastrear
                  captação e atividades associadas.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 text-xs space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">
                      Base Oficial TSE Deferidos & Reeleição
                    </h4>
                    <p className="text-slate-400 text-[11px]">
                      Filtre por município (São Paulo, Campinas, Santos, etc.) e cargo.
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleJumpToSection('/candidates')}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs h-8"
                >
                  Ir para Lista de Candidaturas SP →
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Equipes & Atividades */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <Badge className="bg-amber-500 text-slate-950 font-black text-[10px] uppercase">
                  Pilar 02 • Equipes & Ações de Rua
                </Badge>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Planeje Equipes e Atividades de Campo
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Crie equipes com responsáveis obrigatórios e membros. Planeje ações como
                  panfletagem, adesivação e comícios vinculadas a até dois candidatos e setores
                  estratégicos.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  <h4 className="font-bold text-white text-xs">Aba Equipes</h4>
                  <p className="text-[11px] text-slate-400">
                    Defina líderes zonais e voluntários por região.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                  <h4 className="font-bold text-white text-xs">Aba Atividades</h4>
                  <p className="text-[11px] text-slate-400">
                    Gere links de rastreamento com efetivo declarado.
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => handleJumpToSection('/team')}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs h-8"
              >
                Gerenciar Equipes & Atividades →
              </Button>
            </div>
          )}

          {/* Step 4: Ready to Go */}
          {step === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <Badge className="bg-emerald-500 text-slate-950 font-black text-[10px] uppercase">
                  Tudo Pronto!
                </Badge>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Sua central de inteligência está operacional
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Acesse o <strong>Mapa Geral</strong> para ver apoiadores geolocalizados, o{' '}
                  <strong>Dashboard de Captação</strong> para acompanhar metas diárias, e o{' '}
                  <strong>Consultor IA</strong> para tirar dúvidas táticas da legislação eleitoral.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/20 via-slate-800 to-slate-800 border border-amber-500/30 text-xs space-y-2">
                <div className="font-bold text-amber-300 flex items-center gap-2 text-sm">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Dica de Sucesso da Coordenação
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Incentive os militantes a realizarem check-ins fotográficos de campo e a
                  compartilharem o QR Code exclusivo de indicação para acelerar a base eleitoral.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <DialogFooter className="p-4 sm:p-6 bg-slate-950 border-t border-slate-800 flex flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={step === 1 ? onClose : handlePrev}
            className="text-xs text-slate-400 hover:text-white"
          >
            {step === 1 ? (
              'Pular Tour'
            ) : (
              <>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Voltar
              </>
            )}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleNext}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md"
          >
            {step === totalSteps ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Começar a Usar
              </>
            ) : (
              <>
                Avançar <ArrowRight className="w-4 h-4 ml-1.5" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
