import React, { useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useCampaign } from '@/hooks/use-campaign'
import { webPushService, type PushPermissionState } from '@/services/webPush'
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
  Bell,
  Smartphone,
  Check,
  AlertCircle,
  Send,
  Database,
  Key,
  Globe,
  Sparkles,
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

  // Web Push Notifications
  const [pushState, setPushState] = useState<PushPermissionState>(() =>
    webPushService.getPermissionState(),
  )
  const [isSubscribingPush, setIsSubscribingPush] = useState(false)
  const [isTestingPush, setIsTestingPush] = useState(false)

  // New campaign modal
  const [campaignModalOpen, setCampaignModalOpen] = useState(false)
  const [campName, setCampName] = useState('')
  const [candidateName, setCandidateName] = useState('')
  const [party, setParty] = useState('')
  const [ibgeCode, setIbgeCode] = useState('3550308')
  const [targetVotes, setTargetVotes] = useState(300000)
  const [color, setColor] = useState('#F59E0B')
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false)

  // Premium Electoral Data Provider Extension Configuration
  const [premiumProviderUrl, setPremiumProviderUrl] = useState(
    () => localStorage.getItem('estrategista_premium_tse_url') || '',
  )
  const [premiumProviderKey, setPremiumProviderKey] = useState(
    () => localStorage.getItem('estrategista_premium_tse_key') || '',
  )
  const [isSavingProvider, setIsSavingProvider] = useState(false)

  const handleTogglePush = async () => {
    if (!webPushService.isSupported()) {
      toast.error('Este navegador ou dispositivo não oferece suporte a Web Push.')
      return
    }

    try {
      setIsSubscribingPush(true)
      if (pushState === 'granted') {
        await webPushService.unsubscribeUser()
        setPushState('default')
        toast.info('Notificações no celular desativadas.')
      } else {
        const res = await webPushService.subscribeUser(currentCampaign?.id)
        if (res.success) {
          setPushState('granted')
          toast.success('Notificações push ativadas com sucesso!')
        } else {
          setPushState(webPushService.getPermissionState())
          toast.error(res.error || 'Não foi possível ativar notificações.')
        }
      }
    } finally {
      setIsSubscribingPush(false)
    }
  }

  const handleTestPush = async () => {
    try {
      setIsTestingPush(true)
      const res = await webPushService.dispatchPushNotification({
        campaign_id: currentCampaign?.id,
        title: '🔔 Teste de Notificação • Estrategista',
        body: 'Alerta push funcionando em tempo real para o coordenador!',
        url: '/dashboard',
        tag: 'test-push-' + Date.now(),
      })
      if (res.success) {
        toast.success('Disparo de teste executado com sucesso!')
      } else {
        toast.warning('Disparo testado localmente no dispositivo.')
      }
    } catch {
      toast.error('Erro ao enviar push de teste.')
    } finally {
      setIsTestingPush(false)
    }
  }

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
    <div className="p-3 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto w-full min-w-0 overflow-x-hidden">
      <div className="bg-slate-900 p-4 sm:p-6 rounded-2xl text-white shadow-lg border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Badge className="bg-amber-500 text-slate-950 font-bold text-xs uppercase shrink-0">
              Configurações & Governança
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-black break-words">
            Gerenciamento da Conta & Campanhas
          </h1>
          <p className="text-xs text-slate-300 mt-1 break-words">
            Altere seus dados de coordenador e crie novas campanhas multi-político.
          </p>
        </div>
      </div>

      {/* Web Push Configuration Card */}
      <Card className="border-amber-500/40 shadow-md bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 text-white">
        <CardHeader className="border-b border-slate-800 pb-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  Notificações Web Push no Celular
                  <Badge
                    className={`text-[10px] font-black ${
                      pushState === 'granted'
                        ? 'bg-emerald-500 text-slate-950'
                        : pushState === 'denied'
                          ? 'bg-rose-500 text-white'
                          : pushState === 'unsupported'
                            ? 'bg-slate-700 text-slate-300'
                            : 'bg-amber-500 text-slate-950'
                    }`}
                  >
                    {pushState === 'granted'
                      ? '● ATIVO'
                      : pushState === 'denied'
                        ? '✖ BLOQUEADO'
                        : pushState === 'unsupported'
                          ? 'NÃO SUPORTADO'
                          : 'INATIVO'}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Receba alertas críticos de virada e oscilações bruscas mesmo com o app fechado
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {pushState === 'granted' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTestPush}
                  disabled={isTestingPush}
                  className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white text-xs h-8"
                >
                  <Send className="w-3.5 h-3.5 mr-1 text-amber-400" />
                  {isTestingPush ? 'Enviando...' : 'Testar Push'}
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleTogglePush}
                disabled={isSubscribingPush || pushState === 'unsupported'}
                className={`text-xs h-8 font-bold ${
                  pushState === 'granted'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                }`}
              >
                <Bell className="w-3.5 h-3.5 mr-1" />
                {isSubscribingPush
                  ? 'Processando...'
                  : pushState === 'granted'
                    ? 'Desativar Push no Celular'
                    : 'Ativar Notificações no Celular'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 text-xs space-y-3">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-white">
                Como funciona o alerta de virada via Web Push:
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Quando novos levantamentos de pesquisa forem registrados e o sistema detectar perda
                de liderança ou queda de 3 p.p.+, o celular do coordenador receberá uma notificação
                vibratória com acesso direto ao dossiê tático.
              </p>
            </div>
          </div>

          {pushState === 'denied' && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>
                As notificações foram bloqueadas no navegador. Para reativar, clique no cadeado ao
                lado do endereço e permita "Notificações".
              </span>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Premium Electoral Data Provider Integration (TSE / Paid Provider Extension) */}
      <Card className="border-slate-800 bg-slate-900 text-white shadow-md">
        <CardHeader className="border-b border-slate-800 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  Provedor de Dados Eleitorais & TSE
                  <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px]">
                    Extensível
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Integração oficial gratuita com DivulgaCand TSE e ponto de extensão para
                  provedores pagos.
                </CardDescription>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-1 rounded font-mono font-bold inline-flex items-center gap-1">
                <Check className="w-3 h-3" /> Base TSE SP Conectada
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Como funciona a sincronização automática:
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Por padrão, o Estrategista Eleitoral se conecta à API aberta do TSE
              (DivulgaCand/Contas) e à base estruturada oficial com upsert automático por número de
              urna, ano e cargo. Se você contratar uma API privada ou empresa de Big Data eleitoral
              parceira, insira o endpoint e chave de acesso abaixo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-blue-400" /> Endpoint / URL da API do Provedor
              </Label>
              <Input
                placeholder="Ex: https://api.dados-eleitorais-premium.com.br/v1/candidatos"
                value={premiumProviderUrl}
                onChange={(e) => setPremiumProviderUrl(e.target.value)}
                className="h-9 text-xs bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-600"
              />
              <span className="text-[10px] text-slate-500">
                Deixe em branco para usar a API oficial gratuita do TSE.
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-amber-400" /> Chave de Acesso / API Token
              </Label>
              <Input
                type="password"
                placeholder="Ex: sec_live_tse_..."
                value={premiumProviderKey}
                onChange={(e) => setPremiumProviderKey(e.target.value)}
                className="h-9 text-xs bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-600 font-mono"
              />
              <span className="text-[10px] text-slate-500">
                Token de autenticação fornecido pelo seu provedor parceiro.
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 flex-wrap gap-2">
            <span className="text-[11px] text-slate-400">
              Provedor ativo:{' '}
              <strong className="text-amber-400">
                {premiumProviderUrl && premiumProviderKey
                  ? 'Provedor Pago Personalizado'
                  : 'TSE Aberto DivulgaCand (Oficial Gratuito)'}
              </strong>
            </span>

            <Button
              onClick={() => {
                setIsSavingProvider(true)
                if (premiumProviderUrl.trim() && premiumProviderKey.trim()) {
                  localStorage.setItem('estrategista_premium_tse_url', premiumProviderUrl.trim())
                  localStorage.setItem('estrategista_premium_tse_key', premiumProviderKey.trim())
                  localStorage.setItem('estrategista_premium_tse_name', 'Provedor Premium Custom')
                  toast.success('Configurações do Provedor Salvas!')
                } else {
                  localStorage.removeItem('estrategista_premium_tse_url')
                  localStorage.removeItem('estrategista_premium_tse_key')
                  localStorage.setItem('estrategista_premium_tse_name', 'TSE Oficial (Gratuito)')
                  toast.info('Restaurado para conexão oficial gratuita do TSE.')
                }
                setTimeout(() => setIsSavingProvider(false), 300)
              }}
              disabled={isSavingProvider}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-8 px-3"
            >
              {isSavingProvider ? 'Salvando...' : 'Salvar Provedor'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Multi-Campaign Management Section */}
      <Card className="border-slate-200/80 shadow-sm bg-white">
        <CardHeader className="border-b border-slate-100 p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2 truncate">
              <Layers className="w-5 h-5 text-amber-500 shrink-0" /> Campanhas Eleitorais Ativas (
              {campaigns.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 truncate">
              Arquitetura multi-político para gerenciar múltiplos candidatos na mesma plataforma
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => setCampaignModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 w-full sm:w-auto justify-center"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Criar Campanha
          </Button>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-3">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className={`p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 transition-all min-w-0 ${
                currentCampaign?.id === c.id
                  ? 'bg-amber-500/10 border-amber-500/40'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: c.color || '#F59E0B' }}
                  />
                  <span className="font-bold text-slate-900 text-sm truncate">{c.name}</span>
                  {currentCampaign?.id === c.id && (
                    <Badge className="bg-amber-500 text-slate-950 text-[10px] font-bold shrink-0">
                      SELECIONADA
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-slate-600 mt-1 break-words">
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
