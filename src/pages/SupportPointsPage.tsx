import React, { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useCampaign } from '@/hooks/use-campaign'
import type { SupportPoint } from '@/types/campaign'
import {
  Building2,
  MapPin,
  Phone,
  User,
  Plus,
  Compass,
  CheckCircle2,
  Trash2,
  Search,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

export const SupportPointsPage: React.FC = () => {
  const { currentCampaign } = useCampaign()
  const [supportPoints, setSupportPoints] = useState<SupportPoint[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [type, setType] = useState<'office' | 'committee' | 'partner'>('committee')
  const [lat, setLat] = useState<number>(-23.5614)
  const [lng, setLng] = useState<number>(-46.6558)
  const [contact, setContact] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')

  const fetchPoints = async () => {
    if (!currentCampaign) return
    try {
      const records = await pb.collection('support_points').getFullList<SupportPoint>({
        filter: `campaign_id = "${currentCampaign.id}"`,
        sort: '-created',
      })
      setSupportPoints(records)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchPoints()
  }, [currentCampaign])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentCampaign) {
      toast.error('Nenhuma campanha selecionada')
      return
    }

    try {
      setIsSubmitting(true)
      await pb.collection('support_points').create({
        campaign_id: currentCampaign.id,
        name,
        type,
        lat,
        lng,
        contact,
        phone,
        address,
      })

      toast.success('Ponto de apoio registrado com sucesso!')
      setDialogOpen(false)
      setName('')
      setContact('')
      setPhone('')
      setAddress('')
      fetchPoints()
    } catch (err) {
      toast.error('Erro ao cadastrar ponto de apoio')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente remover este ponto de apoio?')) return
    try {
      await pb.collection('support_points').delete(id)
      toast.success('Ponto removido com sucesso')
      fetchPoints()
    } catch (err) {
      toast.error('Erro ao excluir ponto')
    }
  }

  const filtered = supportPoints.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.address && p.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.contact && p.contact.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  return (
    <div className="p-3 sm:p-5 lg:p-8 space-y-6 max-w-7xl mx-auto w-full min-w-0 overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-4 sm:p-6 rounded-2xl text-white shadow-lg border border-slate-800 min-w-0">
        <div className="min-w-0 w-full sm:w-auto">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Badge className="bg-amber-500 text-slate-950 font-bold text-xs uppercase shrink-0">
              Infraestrutura Fixa
            </Badge>
            <span className="text-xs text-slate-300 truncate">Hubs de Distribuição e Apoio</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold break-words">
            Pontos de Apoio & Comitês
          </h1>
          <p className="text-xs text-slate-300 mt-1 break-words">
            Gerencie comitês centrais, regionais e residências de lideranças comunitárias.
          </p>
        </div>

        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md h-9 sm:h-10 px-3.5 text-xs sm:text-sm w-full sm:w-auto justify-center whitespace-normal"
        >
          <Plus className="w-4 h-4 mr-1.5 shrink-0" /> Novo Ponto de Apoio
        </Button>
      </div>

      {/* Filter and stats bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <Input
            placeholder="Buscar por nome, endereço ou contato..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Total: <strong>{filtered.length}</strong> locais cadastrados
        </div>
      </div>

      {/* Grid of Support Points */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((point) => {
          const typeBadge =
            point.type === 'office'
              ? { label: 'Comitê Central', bg: 'bg-amber-500/20 text-amber-800 border-amber-300' }
              : point.type === 'committee'
                ? { label: 'Comitê Regional', bg: 'bg-blue-500/20 text-blue-800 border-blue-300' }
                : {
                    label: 'Ponto Parceiro / Casa',
                    bg: 'bg-emerald-500/20 text-emerald-800 border-emerald-300',
                  }

          return (
            <Card
              key={point.id}
              className="border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow"
            >
              <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
                <Badge variant="outline" className={`text-[10px] font-bold ${typeBadge.bg}`}>
                  {typeBadge.label}
                </Badge>
                <button
                  onClick={() => handleDelete(point.id)}
                  className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <CardTitle className="text-base font-bold text-slate-900 leading-snug">
                  {point.name}
                </CardTitle>
                <div className="text-xs text-slate-600 flex items-start gap-2">
                  <MapPin className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
                  <span>{point.address || 'Endereço não cadastrado'}</span>
                </div>
                {point.contact && (
                  <div className="text-xs text-slate-600 flex items-center gap-2">
                    <User className="w-4 h-4 shrink-0 text-slate-400" />
                    <span>
                      Responsável: <strong>{point.contact}</strong>
                    </span>
                  </div>
                )}
                {point.phone && (
                  <div className="text-xs text-slate-600 flex items-center gap-2">
                    <Phone className="w-4 h-4 shrink-0 text-slate-400" />
                    <span>{point.phone}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    Lat: {point.lat.toFixed(4)}, Lng: {point.lng.toFixed(4)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Cadastrar Ponto de Apoio
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Adicione novos comitês ou casas de apoio que aparecerão nas camadas do mapa.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nome do Ponto</Label>
              <Input
                placeholder="Ex: Comitê Vila Madalena"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Tipo de Estrutura</Label>
              <Select value={type} onValueChange={(val: any) => setType(val)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="office">Comitê Central / QG</SelectItem>
                  <SelectItem value="committee">Comitê Regional / Distrital</SelectItem>
                  <SelectItem value="partner">Ponto de Apoio Parceiro / Residência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Endereço Completo</Label>
              <Input
                placeholder="Ex: Rua Fradique Coutinho, 1200 - Pinheiros"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="text-xs"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Contato / Liderança</Label>
                <Input
                  placeholder="Nome do responsável"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Telefone / WhatsApp</Label>
                <Input
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Latitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value))}
                  className="text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Longitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={lng}
                  onChange={(e) => setLng(parseFloat(e.target.value))}
                  className="text-xs"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-slate-900 text-white text-xs font-bold"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Ponto de Apoio'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
