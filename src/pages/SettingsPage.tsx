import React, { useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useCampaign } from '@/hooks/use-campaign'
import {
  Settings,
  User,
  Mail,
  Shield,
  Layers,
  Building,
  Plus,
  CheckCircle2,
  Lock,
  Compass,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export const SettingsPage: React.FC = () => {
  const { user, requestEmailChange, refreshUser } = useAuth()
  const { campaigns, currentCampaign, refreshCampaigns } = useCampaign()

  // Profile update
  const [name, setName] = useState(user?.name || '')
  const [newEmail, setNewEmail] = useState('')
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false)

  // New campaign modal
  const [campaignModalOpen, setCampaignModalOpen] = useState(false)
  const [campName, setCampName] = useState('')
  const [candidateName, setCandidateName] = useState('')
  const [party, setParty] = useState('')
  const [ibgeCode, setIbgeCode] = useState('3550308')
  const [targetVotes, setTargetVotes] = useState(300000)
  const [color, setColor] = useState('#F59E0B')
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false)

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    try {
      setIsUpdatingProfile(true)
      await pb.collection('users').update(user.id, { name })
      await refreshUser()
      toast.success('Perfil atualizado com sucesso!')
    } catch {
      toast.error('Erro ao atualizar perfil')
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail.trim()) return
    try {
      setIsUpdatingEmail(true)
      const { error } = await requestEmailChange(newEmail.trim())
      if (error) {
        toast.error(error.message || 'Erro ao solicitar troca de email')
      } else {
        toast.success(`Email de confirmação enviado para ${newEmail}!`)
        setNewEmail('')
      }
    } finally {
      setIsUpdatingEmail(false)
    }
  }

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsCreatingCampaign(true)
      await pb.collection('campaigns').create({
        name: campName,
        candidate_name: candidateName,
        party,
        ibge_city_code: ibgeCode,
        target_votes: targetVotes,
        color,
      })

      toast.success('Nova campanha eleitoral criada com sucesso!')
      setCampaignModalOpen(false)
      setCampName('')
      setCandidateName('')
      setParty('')
      await refreshCampaigns()
    } catch {
      toast.error('Erro ao criar campanha')
    } finally {
      setIsCreatingCampaign(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto w-full">
      <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-lg border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge className="bg-amber-500 text-slate-950 font-bold text-xs uppercase">
              Configurações & Governança
            </Badge>
          </div>
          <h1 className="text-2xl font-black">Gerenciamento da Conta & Campanhas</h1>
          <p className="text-xs text-slate-300 mt-1">
            Altere seus dados de coordenador e crie novas campanhas multi-político.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card className="border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-amber-500" /> Meu Perfil
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Informações públicas na rede de campanha
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nome Completo</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nível de Acesso (Cargo)</Label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 capitalize">
                  {user?.role === 'admin'
                    ? '🛡️ Coordenador Geral (Admin)'
                    : user?.role === 'coordinator'
                      ? '📋 Coordenador de Zona'
                      : '🏃 Militante de Campo'}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Email Atual</Label>
                <Input
                  value={user?.email || ''}
                  disabled
                  className="text-xs bg-slate-50 text-slate-500"
                />
              </div>
              <Button
                type="submit"
                disabled={isUpdatingProfile}
                className="w-full bg-slate-900 text-white font-bold text-xs"
              >
                {isUpdatingProfile ? 'Salvando...' : 'Salvar Alterações do Perfil'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Email Card */}
        <Card className="border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-500" /> Troca de Email Institucional
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Requer confirmação com token enviado por email transacional
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleRequestEmailChange} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Novo Endereço de Email</Label>
                <Input
                  type="email"
                  placeholder="novoemail@campanha.com.br"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Um link de verificação será enviado ao novo endereço para validação imediata.
              </p>
              <Button
                type="submit"
                disabled={isUpdatingEmail}
                className="w-full bg-slate-800 text-white font-bold text-xs"
              >
                {isUpdatingEmail ? 'Enviando link...' : 'Solicitar Troca de Email'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Multi-Campaign Management Section */}
      <Card className="border-slate-200/80 shadow-sm bg-white">
        <CardHeader className="border-b border-slate-100 p-4 sm:p-6 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-500" /> Campanhas Eleitorais Ativas (
              {campaigns.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Arquitetura multi-político para gerenciar múltiplos candidatos na mesma plataforma
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => setCampaignModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Criar Campanha
          </Button>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-3">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                currentCampaign?.id === c.id
                  ? 'bg-amber-500/10 border-amber-500/40'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: c.color || '#F59E0B' }}
                  />
                  <span className="font-bold text-slate-900 text-sm">{c.name}</span>
                  {currentCampaign?.id === c.id && (
                    <Badge className="bg-amber-500 text-slate-950 text-[10px] font-bold">
                      SELECIONADA
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Candidato: <strong>{c.candidate_name}</strong> • Partido:{' '}
                  <strong>{c.party}</strong> • Meta:{' '}
                  <strong>{(c.target_votes || 0).toLocaleString('pt-BR')} votos</strong>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* New Campaign Modal */}
      <Dialog open={campaignModalOpen} onOpenChange={setCampaignModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Cadastrar Nova Campanha
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Adicione um novo candidato ou chapa majoritária/proporcional.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCampaign} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nome da Campanha</Label>
              <Input
                placeholder="Ex: Campanha Deputado Vitória 2026"
                value={campName}
                onChange={(e) => setCampName(e.target.value)}
                className="text-xs"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nome do Candidato</Label>
                <Input
                  placeholder="Ex: Dra. Juliana Costa"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Partido / Número</Label>
                <Input
                  placeholder="Ex: PSD - 55"
                  value={party}
                  onChange={(e) => setParty(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Código IBGE Município</Label>
                <Input
                  value={ibgeCode}
                  onChange={(e) => setIbgeCode(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Meta de Votos</Label>
                <Input
                  type="number"
                  value={targetVotes}
                  onChange={(e) => setTargetVotes(Number(e.target.value))}
                  className="text-xs"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCampaignModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isCreatingCampaign}
                className="bg-slate-900 text-white text-xs font-bold"
              >
                {isCreatingCampaign ? 'Criando...' : 'Salvar Campanha'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
