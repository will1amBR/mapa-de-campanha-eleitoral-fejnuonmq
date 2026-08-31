import React, { useState, useEffect, useMemo } from 'react'
import { useCampaign } from '@/hooks/use-campaign'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import {
  tseAccountingService,
  TSE_CATEGORY_LABELS,
  TSE_PROOF_STATUS_MAP,
  TSE_DELIVERY_STATUS_MAP,
} from '@/services/tseAccounting'
import type {
  TseTransaction,
  TseDelivery,
  TseTransactionType,
  TseCategory,
  TseProofStatus,
  TseDocumentType,
  TseDeliveryStatus,
  TseDeliveryType,
} from '@/types/campaign'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Scale,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Receipt,
  FileText,
  Upload,
  Clock,
  Calendar,
  Building2,
  Trash2,
  Edit2,
  Download,
  Search,
  Filter,
  ShieldCheck,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { toast } from 'sonner'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const PIE_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B']

export const TseAccountingPage: React.FC = () => {
  const { currentCampaign } = useCampaign()
  const { user } = useAuth()

  const [transactions, setTransactions] = useState<TseTransaction[]>([])
  const [deliveries, setDeliveries] = useState<TseDelivery[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [activeTab, setActiveTab] = useState<'conciliacao' | 'transactions' | 'deliveries'>(
    'conciliacao',
  )
  const [typeFilter, setTypeFilter] = useState<'all' | 'receita' | 'despesa'>('all')
  const [proofFilter, setProofFilter] = useState<'all' | TseProofStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals
  const [isTxModalOpen, setIsTxModalOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<TseTransaction | null>(null)
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false)
  const [editingDelivery, setEditingDelivery] = useState<TseDelivery | null>(null)

  // Form states for transaction
  const [txType, setTxType] = useState<TseTransactionType>('despesa')
  const [txCategory, setTxCategory] = useState<TseCategory>('material_grafico')
  const [txDescription, setTxDescription] = useState('')
  const [txAmount, setTxAmount] = useState('')
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0])
  const [txDocNumber, setTxDocNumber] = useState('')
  const [txDocType, setTxDocType] = useState<TseDocumentType>('nota_fiscal')
  const [txPartyName, setTxPartyName] = useState('')
  const [txPartyDoc, setTxPartyDoc] = useState('')
  const [txProofStatus, setTxProofStatus] = useState<TseProofStatus>('comprovado')
  const [txNotes, setTxNotes] = useState('')
  const [txReceiptFile, setTxReceiptFile] = useState<File | null>(null)
  const [isSavingTx, setIsSavingTx] = useState(false)

  // Form states for delivery
  const [delTitle, setDelTitle] = useState('')
  const [delDescription, setDelDescription] = useState('')
  const [delDeadline, setDelDeadline] = useState('')
  const [delType, setDelType] = useState<TseDeliveryType>('parcial')
  const [delStatus, setDelStatus] = useState<TseDeliveryStatus>('pendente')
  const [delProtocol, setDelProtocol] = useState('')
  const [delDeliveredAt, setDelDeliveredAt] = useState('')
  const [delNotes, setDelNotes] = useState('')
  const [isSavingDel, setIsSavingDel] = useState(false)

  const fetchData = async () => {
    if (!currentCampaign) return
    try {
      setLoading(true)
      const [txList, delList] = await Promise.all([
        tseAccountingService.getTransactions(currentCampaign.id),
        tseAccountingService.getDeliveries(currentCampaign.id),
      ])
      setTransactions(txList)
      setDeliveries(delList)
    } catch (err) {
      console.error('Error loading TSE accounting data:', err)
      toast.error('Erro ao carregar dados de prestação de contas do TRE')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [currentCampaign])

  // ==========================================
  // CONCILIATION & RECONCILIATION METRICS
  // ==========================================
  const conciliation = useMemo(() => {
    const totalReceitas = transactions
      .filter((t) => t.type === 'receita')
      .reduce((acc, t) => acc + (t.amount || 0), 0)

    const totalDespesas = transactions
      .filter((t) => t.type === 'despesa')
      .reduce((acc, t) => acc + (t.amount || 0), 0)

    const saldoDisponivel = totalReceitas - totalDespesas

    const comprovadasReceitas = transactions
      .filter((t) => t.type === 'receita' && t.proof_status === 'comprovado')
      .reduce((acc, t) => acc + (t.amount || 0), 0)

    const comprovadasDespesas = transactions
      .filter((t) => t.type === 'despesa' && t.proof_status === 'comprovado')
      .reduce((acc, t) => acc + (t.amount || 0), 0)

    const pendentesDespesas = transactions
      .filter((t) => t.type === 'despesa' && t.proof_status !== 'comprovado')
      .reduce((acc, t) => acc + (t.amount || 0), 0)

    const pendentesReceitas = transactions
      .filter((t) => t.type === 'receita' && t.proof_status !== 'comprovado')
      .reduce((acc, t) => acc + (t.amount || 0), 0)

    const totalComprovado = comprovadasReceitas + comprovadasDespesas
    const totalDeclarado = totalReceitas + totalDespesas
    const percentComprovado = totalDeclarado > 0 ? (totalComprovado / totalDeclarado) * 100 : 100

    // Balance check: Are revenues enough to cover expenses?
    const balanceHealthy = saldoDisponivel >= 0
    const hasDivergence = pendentesDespesas > 0 || pendentesReceitas > 0 || !balanceHealthy

    // Deliveries summary
    const totalObligations = deliveries.length
    const completedObligations = deliveries.filter((d) => d.status === 'concluido').length
    const pendingObligations = deliveries.filter(
      (d) => d.status === 'pendente' || d.status === 'em_andamento',
    ).length
    const overdueObligations = deliveries.filter((d) => d.status === 'em_atraso').length

    return {
      totalReceitas,
      totalDespesas,
      saldoDisponivel,
      comprovadasReceitas,
      comprovadasDespesas,
      pendentesDespesas,
      pendentesReceitas,
      percentComprovado,
      balanceHealthy,
      hasDivergence,
      totalObligations,
      completedObligations,
      pendingObligations,
      overdueObligations,
    }
  }, [transactions, deliveries])

  // Category breakdown for charts
  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    transactions
      .filter((t) => t.type === 'despesa')
      .forEach((t) => {
        const catName = TSE_CATEGORY_LABELS[t.category] || t.category
        map[catName] = (map[catName] || 0) + (t.amount || 0)
      })

    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [transactions])

  const revenueByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    transactions
      .filter((t) => t.type === 'receita')
      .forEach((t) => {
        const catName = TSE_CATEGORY_LABELS[t.category] || t.category
        map[catName] = (map[catName] || 0) + (t.amount || 0)
      })

    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [transactions])

  // Filtered transactions list
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false
      if (proofFilter !== 'all' && t.proof_status !== proofFilter) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchDesc = t.description?.toLowerCase().includes(q)
        const matchParty = t.party_name?.toLowerCase().includes(q)
        const matchDoc = t.document_number?.toLowerCase().includes(q)
        const matchDocParty = t.party_document?.toLowerCase().includes(q)
        if (!matchDesc && !matchParty && !matchDoc && !matchDocParty) return false
      }
      return true
    })
  }, [transactions, typeFilter, proofFilter, searchQuery])

  // Transaction modal handlers
  const handleOpenCreateTx = (type: TseTransactionType = 'despesa') => {
    setEditingTx(null)
    setTxType(type)
    setTxCategory(type === 'receita' ? 'doacao_pf' : 'material_grafico')
    setTxDescription('')
    setTxAmount('')
    setTxDate(new Date().toISOString().split('T')[0])
    setTxDocNumber('')
    setTxDocType(type === 'receita' ? 'recibo_eleitoral' : 'nota_fiscal')
    setTxPartyName('')
    setTxPartyDoc('')
    setTxProofStatus('comprovado')
    setTxNotes('')
    setTxReceiptFile(null)
    setIsTxModalOpen(true)
  }

  const handleOpenEditTx = (tx: TseTransaction) => {
    setEditingTx(tx)
    setTxType(tx.type)
    setTxCategory(tx.category)
    setTxDescription(tx.description)
    setTxAmount(String(tx.amount))
    setTxDate(tx.transaction_date.split('T')[0].split(' ')[0])
    setTxDocNumber(tx.document_number || '')
    setTxDocType(tx.document_type || (tx.type === 'receita' ? 'recibo_eleitoral' : 'nota_fiscal'))
    setTxPartyName(tx.party_name || '')
    setTxPartyDoc(tx.party_document || '')
    setTxProofStatus(tx.proof_status || 'comprovado')
    setTxNotes(tx.notes || '')
    setTxReceiptFile(null)
    setIsTxModalOpen(true)
  }

  const handleSaveTx = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentCampaign) return

    const amt = parseFloat(txAmount.replace(',', '.'))
    if (isNaN(amt) || amt <= 0) {
      toast.error('Informe um valor numérico válido maior que zero.')
      return
    }

    if (!txDescription.trim()) {
      toast.error('Informe a descrição do lançamento.')
      return
    }

    if (!txPartyName.trim()) {
      toast.error('Informe o nome do fornecedor ou doador.')
      return
    }

    try {
      setIsSavingTx(true)

      const formData = new FormData()
      formData.append('campaign_id', currentCampaign.id)
      formData.append('type', txType)
      formData.append('category', txCategory)
      formData.append('description', txDescription.trim())
      formData.append('amount', String(amt))
      formData.append('transaction_date', new Date(txDate).toISOString())
      formData.append('document_number', txDocNumber.trim())
      formData.append('document_type', txDocType)
      formData.append('party_name', txPartyName.trim())
      formData.append('party_document', txPartyDoc.trim())
      formData.append('proof_status', txProofStatus)
      formData.append('notes', txNotes.trim())

      if (txReceiptFile) {
        formData.append('receipt_file', txReceiptFile)
      }

      if (editingTx) {
        await tseAccountingService.updateTransaction(editingTx.id, formData)
        toast.success('Lançamento fiscal atualizado com sucesso!')
      } else {
        await tseAccountingService.createTransaction(formData)
        toast.success('Lançamento registrado com sucesso!')
      }

      setIsTxModalOpen(false)
      fetchData()
    } catch (err: any) {
      console.error('Error saving transaction:', err)
      toast.error(err.message || 'Erro ao salvar lançamento fiscal')
    } finally {
      setIsSavingTx(false)
    }
  }

  const handleDeleteTx = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este lançamento?')) return
    try {
      await tseAccountingService.deleteTransaction(id)
      setTransactions((prev) => prev.filter((t) => t.id !== id))
      toast.success('Lançamento excluído.')
    } catch (err) {
      toast.error('Erro ao excluir lançamento.')
    }
  }

  // Delivery handlers
  const handleOpenCreateDelivery = () => {
    setEditingDelivery(null)
    setDelTitle('')
    setDelDescription('')
    setDelDeadline(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    setDelType('parcial')
    setDelStatus('pendente')
    setDelProtocol('')
    setDelDeliveredAt('')
    setDelNotes('')
    setIsDeliveryModalOpen(true)
  }

  const handleOpenEditDelivery = (del: TseDelivery) => {
    setEditingDelivery(del)
    setDelTitle(del.title)
    setDelDescription(del.description || '')
    setDelDeadline(del.legal_deadline.split('T')[0].split(' ')[0])
    setDelType(del.delivery_type || 'parcial')
    setDelStatus(del.status || 'pendente')
    setDelProtocol(del.protocol_number || '')
    setDelDeliveredAt(del.delivered_at ? del.delivered_at.split('T')[0].split(' ')[0] : '')
    setDelNotes(del.notes || '')
    setIsDeliveryModalOpen(true)
  }

  const handleSaveDelivery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentCampaign) return

    if (!delTitle.trim()) {
      toast.error('Informe o título da obrigação TRE.')
      return
    }

    try {
      setIsSavingDel(true)
      const payload: Partial<TseDelivery> = {
        campaign_id: currentCampaign.id,
        title: delTitle.trim(),
        description: delDescription.trim(),
        legal_deadline: new Date(delDeadline).toISOString(),
        delivery_type: delType,
        status: delStatus,
        protocol_number: delProtocol.trim(),
        delivered_at: delDeliveredAt ? new Date(delDeliveredAt).toISOString() : undefined,
        notes: delNotes.trim(),
      }

      if (editingDelivery) {
        await tseAccountingService.updateDelivery(editingDelivery.id, payload)
        toast.success('Obrigação TRE atualizada!')
      } else {
        await tseAccountingService.createDelivery(payload)
        toast.success('Nova obrigação TRE registrada no checklist!')
      }

      setIsDeliveryModalOpen(false)
      fetchData()
    } catch (err: any) {
      console.error('Error saving delivery:', err)
      toast.error(err.message || 'Erro ao salvar obrigação')
    } finally {
      setIsSavingDel(false)
    }
  }

  const handleToggleDeliveryStatus = async (del: TseDelivery) => {
    const nextStatus: TseDeliveryStatus = del.status === 'concluido' ? 'pendente' : 'concluido'
    const nextDeliveredAt = nextStatus === 'concluido' ? new Date().toISOString() : undefined

    try {
      await tseAccountingService.updateDelivery(del.id, {
        status: nextStatus,
        delivered_at: nextDeliveredAt,
      })
      setDeliveries((prev) =>
        prev.map((d) =>
          d.id === del.id ? { ...d, status: nextStatus, delivered_at: nextDeliveredAt } : d,
        ),
      )
      toast.success(
        nextStatus === 'concluido'
          ? 'Marcado como entregue/protocolado!'
          : 'Marcado como pendente.',
      )
    } catch (err) {
      toast.error('Erro ao atualizar status.')
    }
  }

  const handleDeleteDelivery = async (id: string) => {
    if (!confirm('Deseja remover esta obrigação do checklist?')) return
    try {
      await tseAccountingService.deleteDelivery(id)
      setDeliveries((prev) => prev.filter((d) => d.id !== id))
      toast.success('Obrigação removida.')
    } catch (err) {
      toast.error('Erro ao remover obrigação.')
    }
  }

  // PDF Export for TSE Report
  const handleExportTsePdf = () => {
    if (!currentCampaign) return

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 14
      let y = 16

      // Header
      doc.setFillColor(11, 18, 32)
      doc.rect(0, 0, pageWidth, 28, 'F')
      doc.setFillColor(245, 158, 11)
      doc.rect(0, 28, pageWidth, 2, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(12)
      doc.text('ESTRATEGISTA ELEITORAL • PRESTAÇÃO DE CONTAS & NOTAS FISCAIS (TRE/TSE)', margin, 11)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(245, 158, 11)
      doc.text(
        `${(currentCampaign.name || 'Campanha').toUpperCase()} — ${currentCampaign.candidate_name} (${currentCampaign.party})`,
        margin,
        17,
      )

      doc.setTextColor(156, 163, 175)
      doc.setFontSize(7.5)
      const genDate = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      doc.text(
        `Demonstrativo de Conciliação Contábil e Documentação Fiscal • Gerado em ${genDate}`,
        margin,
        23,
      )

      y = 36

      // Conciliation Summary Table
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(11, 18, 32)
      doc.text('1. DEMONSTRATIVO CONSOLIDADO: RECEITAS vs DESPESAS', margin, y)
      y += 4

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        theme: 'grid',
        headStyles: {
          fillColor: [11, 18, 32],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
        },
        bodyStyles: { fontSize: 8, textColor: [15, 23, 42], cellPadding: 2.5 },
        columns: [
          { header: 'Total Doações (Receitas)', dataKey: 'receitas' },
          { header: 'Total Gastos (Despesas)', dataKey: 'despesas' },
          { header: 'Saldo Eleitoral Atual', dataKey: 'saldo' },
          { header: 'Comprovação Fiscal', dataKey: 'comprovado' },
          { header: 'Status Conciliação', dataKey: 'status' },
        ],
        body: [
          {
            receitas: formatBRL(conciliation.totalReceitas),
            despesas: formatBRL(conciliation.totalDespesas),
            saldo: formatBRL(conciliation.saldoDisponivel),
            comprovado: `${conciliation.percentComprovado.toFixed(1)}% comprovado`,
            status: conciliation.balanceHealthy
              ? 'CONCILIADO / REGULAR'
              : 'ALERTA: DÉBITO A COBRIR',
          },
        ],
      })

      // @ts-expect-error autoTable finalY
      y = doc.lastAutoTable.finalY + 6

      // Transactions Table
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(11, 18, 32)
      doc.text('2. LANÇAMENTOS FISCAIS DE ENTRADA (DOAÇÕES) E SAÍDA (NOTAS FISCAIS)', margin, y)
      y += 4

      const txRows = transactions.map((t, idx) => [
        `#${idx + 1}`,
        t.type === 'receita' ? 'RECEITA (+)' : 'DESPESA (-)',
        new Date(t.transaction_date).toLocaleDateString('pt-BR'),
        t.description,
        t.party_name,
        t.document_number || 'S/N',
        TSE_CATEGORY_LABELS[t.category] || t.category,
        formatBRL(t.amount),
        TSE_PROOF_STATUS_MAP[t.proof_status]?.label || t.proof_status,
      ])

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        theme: 'grid',
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7,
        },
        bodyStyles: { fontSize: 6.5, textColor: [15, 23, 42], cellPadding: 1.8 },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 18, fontStyle: 'bold' },
          2: { cellWidth: 16 },
          3: { cellWidth: 38 },
          4: { cellWidth: 26 },
          5: { cellWidth: 18 },
          6: { cellWidth: 26 },
          7: { cellWidth: 18, fontStyle: 'bold' },
          8: { cellWidth: 20 },
        },
        head: [
          [
            '#',
            'Tipo',
            'Data',
            'Descrição',
            'Doador / Fornecedor',
            'Doc/NF',
            'Espécie/Categoria',
            'Valor',
            'Status',
          ],
        ],
        body: txRows,
      })

      // @ts-expect-error autoTable finalY
      y = doc.lastAutoTable.finalY + 6

      // Deliveries Checklist Table
      if (y > 230) {
        doc.addPage()
        y = 20
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(11, 18, 32)
      doc.text('3. CHECKLIST DE ENTREGAS & PRAZOS LEGAIS DO TRE/SPCE', margin, y)
      y += 4

      const delRows = deliveries.map((d) => [
        d.title,
        new Date(d.legal_deadline).toLocaleDateString('pt-BR'),
        TSE_DELIVERY_STATUS_MAP[d.status]?.label || d.status,
        d.delivered_at ? new Date(d.delivered_at).toLocaleDateString('pt-BR') : '—',
        d.protocol_number || 'Pendente Protocolo',
      ])

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        theme: 'grid',
        headStyles: {
          fillColor: [245, 158, 11],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: 7.5,
        },
        bodyStyles: { fontSize: 7, textColor: [15, 23, 42], cellPadding: 2 },
        head: [
          ['Obrigação Eleitoral', 'Prazo Legal', 'Status', 'Data Entrega', 'Número Protocolo'],
        ],
        body: delRows,
      })

      doc.save(`prestacao_contas_tre_${currentCampaign.id}_${Date.now()}.pdf`)
      toast.success('Demonstrativo TRE exportado em PDF com sucesso!')
    } catch (err) {
      console.error('Error generating TRE PDF:', err)
      toast.error('Erro ao gerar relatório de prestação de contas.')
    }
  }

  const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="p-3 sm:p-5 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
      {/* Top Banner Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 rounded-2xl text-white shadow-lg border border-slate-700/50 min-w-0 w-full">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge className="bg-amber-500 text-slate-950 font-black px-2 py-0.5 text-[10px] sm:text-xs shrink-0">
              MÓDULO DE CONTABILIDADE ELEITORAL • TRE & TSE
            </Badge>
            <span className="text-xs text-slate-300 truncate">
              Entrada e Saída de Notas • Conciliação de Doações e Gastos
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
            Prestação de Contas & Notas Fiscais do Comitê
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Controle rigoroso de receitas, notas fiscais, recibos eleitorais e prazos obrigatórios
            do TRE. Garanta que todas as doações e gastos batam perfeitamente sem riscos de rejeição
            de contas.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2 w-full lg:w-auto shrink-0 flex-wrap sm:flex-nowrap">
          <Button
            onClick={() => handleOpenCreateTx('receita')}
            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-3"
          >
            <Plus className="w-4 h-4 mr-1" /> + Doação (Receita)
          </Button>

          <Button
            onClick={() => handleOpenCreateTx('despesa')}
            className="flex-1 sm:flex-none bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs h-9 px-3"
          >
            <Plus className="w-4 h-4 mr-1" /> + Nota Fiscal (Gasto)
          </Button>

          <Button
            onClick={handleExportTsePdf}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs h-9 px-3.5"
          >
            <Download className="w-4 h-4 mr-1.5" /> Exportar TRE (PDF)
          </Button>
        </div>
      </div>

      {/* Reconciliation Alert / Status Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs shadow-md ${
          !conciliation.hasDivergence
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
            : 'bg-amber-950/40 border-amber-500/50 text-amber-200'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
              !conciliation.hasDivergence
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-amber-500 text-slate-950'
            }`}
          >
            {!conciliation.hasDivergence ? (
              <ShieldCheck className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="font-extrabold text-sm text-white flex items-center gap-2">
              <span>
                {!conciliation.hasDivergence
                  ? 'CONCILIAÇÃO 100% REGULAR • DOAÇÕES E GASTOS BATENDO'
                  : 'ATENÇÃO DO COMITÊ • PENDÊNCIAS DOCUMENTAIS DETECTADAS'}
              </span>
              <Badge
                className={`text-[10px] font-bold ${
                  !conciliation.hasDivergence
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {conciliation.percentComprovado.toFixed(0)}% Documentado
              </Badge>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              {!conciliation.hasDivergence
                ? 'Todas as saídas possuem comprovantes fiscais anexados e o saldo de receitas cobre integralmente as despesas registradas.'
                : `Existem ${formatBRL(conciliation.pendentesDespesas)} em despesas pendentes de nota fiscal/canhoto e ${conciliation.pendingObligations} obrigações legais em andamento.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setActiveTab('deliveries')}
            className="text-xs bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-200 h-8"
          >
            Ver Checklist TRE ({conciliation.completedObligations}/{conciliation.totalObligations})
          </Button>
        </div>
      </div>

      {/* 4 KPI Metric Cards for Accounting */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Total Doações (Receitas) */}
        <Card className="bg-slate-900 border-slate-800 text-white shadow-sm">
          <CardContent className="p-3 sm:p-4 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Total de Doações (Entradas)</span>
              <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black text-emerald-400">
              {formatBRL(conciliation.totalReceitas)}
            </div>
            <div className="text-[10px] text-slate-400">
              {transactions.filter((t) => t.type === 'receita').length} doações registradas
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Total Gastos (Despesas) */}
        <Card className="bg-slate-900 border-slate-800 text-white shadow-sm">
          <CardContent className="p-3 sm:p-4 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Total de Gastos (Saídas)</span>
              <div className="w-6 h-6 rounded-md bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <TrendingDown className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black text-rose-400">
              {formatBRL(conciliation.totalDespesas)}
            </div>
            <div className="text-[10px] text-slate-400">
              {transactions.filter((t) => t.type === 'despesa').length} notas fiscais/recibos
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Saldo Eleitoral Disponível */}
        <Card className="bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 border-amber-500/40 text-white shadow-sm">
          <CardContent className="p-3 sm:p-4 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold">
              <span>Saldo em Caixa Eleitoral</span>
              <div className="w-6 h-6 rounded-md bg-amber-500/30 text-amber-300 flex items-center justify-center">
                <Scale className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-400">
              {formatBRL(conciliation.saldoDisponivel)}
            </div>
            <div className="text-[10px] text-amber-300/80">
              {conciliation.balanceHealthy
                ? 'Receitas cobrem 100% dos gastos'
                : 'ALERTA: Gastos excedem doações'}
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Status Documental / TRE */}
        <Card className="bg-slate-900 border-slate-800 text-white shadow-sm">
          <CardContent className="p-3 sm:p-4 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Comprovação Documental</span>
              <div className="w-6 h-6 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <FileCheck2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black text-blue-300">
              {conciliation.percentComprovado.toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-400">
              {conciliation.pendentesDespesas > 0
                ? `${formatBRL(conciliation.pendentesDespesas)} pendente doc`
                : '100% com nota/recibo'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs: Conciliação, Lançamentos Fiscais, Checklist TRE */}
      <Tabs
        value={activeTab}
        onValueChange={(v: any) => setActiveTab(v)}
        className="w-full space-y-4"
      >
        <TabsList className="bg-slate-900 border border-slate-800 p-1 rounded-xl w-full sm:w-auto grid grid-cols-3">
          <TabsTrigger
            value="conciliacao"
            className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 font-bold text-xs"
          >
            <Scale className="w-3.5 h-3.5 mr-1.5" /> Painel de Conciliação
          </TabsTrigger>
          <TabsTrigger
            value="transactions"
            className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 font-bold text-xs"
          >
            <Receipt className="w-3.5 h-3.5 mr-1.5" /> Notas Fiscais & Doações (
            {transactions.length})
          </TabsTrigger>
          <TabsTrigger
            value="deliveries"
            className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 font-bold text-xs"
          >
            <FileCheck2 className="w-3.5 h-3.5 mr-1.5" /> Checklist TRE ({deliveries.length})
          </TabsTrigger>
        </TabsList>

        {/* ==========================================
            TAB 1: PAINEL DE CONCILIAÇÃO & GRÁFICOS
           ========================================== */}
        <TabsContent value="conciliacao" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Breakdown de Despesas por Categoria */}
            <Card className="bg-slate-900 border-slate-800 text-white shadow-md">
              <CardHeader className="p-4 border-b border-slate-800">
                <CardTitle className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                  Distribuição de Gastos por Espécie / Categoria
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Valores declarados em material gráfico, impulsionamento de anúncios, eventos e
                  equipes.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 flex flex-col items-center">
                <div className="h-60 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={
                          expenseByCategory.length > 0
                            ? expenseByCategory
                            : [{ name: 'Sem despesas', value: 1 }]
                        }
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={40}
                        label={({ name, percent }) =>
                          `${name.substring(0, 12)}... ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {expenseByCategory.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val: any) => formatBRL(Number(val))}
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full text-center text-xs text-slate-400 mt-2">
                  Total de Gastos Analisados:{' '}
                  <strong className="text-rose-400">{formatBRL(conciliation.totalDespesas)}</strong>
                </div>
              </CardContent>
            </Card>

            {/* Origem das Receitas / Doações */}
            <Card className="bg-slate-900 border-slate-800 text-white shadow-md">
              <CardHeader className="p-4 border-b border-slate-800">
                <CardTitle className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Origem dos Recursos & Doações Arrecadadas
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Composição entre Doações de Pessoas Físicas, Recurso Próprio e Fundo
                  Partidário/FEFC.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 flex flex-col items-center">
                <div className="h-60 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={
                          revenueByCategory.length > 0
                            ? revenueByCategory
                            : [{ name: 'Sem doações', value: 1 }]
                        }
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={40}
                        label={({ name, percent }) =>
                          `${name.substring(0, 12)}... ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {revenueByCategory.map((_, index) => (
                          <Cell
                            key={`cell-rev-${index}`}
                            fill={PIE_COLORS[(index + 2) % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val: any) => formatBRL(Number(val))}
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full text-center text-xs text-slate-400 mt-2">
                  Total de Doações Arrecadadas:{' '}
                  <strong className="text-emerald-400">
                    {formatBRL(conciliation.totalReceitas)}
                  </strong>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Summary of Deliveries */}
          <Card className="bg-slate-900 border-slate-800 text-white shadow-md p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-white">
                  Próximos Prazos & Entregas Obrigatórias do TRE
                </h3>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setActiveTab('deliveries')}
                className="text-xs text-amber-400 hover:text-amber-300"
              >
                Gerenciar Checklist →
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {deliveries.slice(0, 3).map((del) => {
                const statusMeta =
                  TSE_DELIVERY_STATUS_MAP[del.status] || TSE_DELIVERY_STATUS_MAP.pendente
                return (
                  <div
                    key={del.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-2"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] text-amber-400 font-bold uppercase">
                          Prazo: {new Date(del.legal_deadline).toLocaleDateString('pt-BR')}
                        </span>
                        <Badge className={`text-[9px] font-bold h-4 px-1 ${statusMeta.bg}`}>
                          {statusMeta.label}
                        </Badge>
                      </div>
                      <h4 className="text-xs font-bold text-white line-clamp-1">{del.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                        {del.description || 'Sem descrição.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>
                        {del.protocol_number
                          ? `Protocolo: ${del.protocol_number}`
                          : 'Pendente de protocolo'}
                      </span>
                      <button
                        onClick={() => handleToggleDeliveryStatus(del)}
                        className="text-amber-400 hover:underline font-bold"
                      >
                        {del.status === 'concluido' ? 'Reabrir' : 'Concluir'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </TabsContent>

        {/* ==========================================
            TAB 2: LISTAGEM DE NOTAS FISCAIS & DOAÇÕES
           ========================================== */}
        <TabsContent value="transactions" className="space-y-4">
          <Card className="bg-slate-900 border-slate-800 text-white shadow-md">
            {/* Filter bar */}
            <div className="p-3 sm:p-4 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    placeholder="Buscar por descrição, fornecedor, CNPJ ou NF..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500"
                  />
                </div>

                <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
                  <SelectTrigger className="w-32 h-9 text-xs bg-slate-950 border-slate-700 text-slate-100">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="receita">Doações (+)</SelectItem>
                    <SelectItem value="despesa">Notas/Gastos (-)</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={proofFilter} onValueChange={(v: any) => setProofFilter(v)}>
                  <SelectTrigger className="w-36 h-9 text-xs bg-slate-950 border-slate-700 text-slate-100 hidden md:flex">
                    <SelectValue placeholder="Status Doc" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <SelectItem value="all">Todos status</SelectItem>
                    <SelectItem value="comprovado">Comprovado</SelectItem>
                    <SelectItem value="pendente_doc">Pendente Doc</SelectItem>
                    <SelectItem value="em_analise">Em Análise</SelectItem>
                    <SelectItem value="divergente">Divergente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => handleOpenCreateTx('despesa')}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs h-9"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> + Nota Fiscal
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleOpenCreateTx('receita')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> + Doação
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-bold tracking-wider text-[10px]">
                    <th className="py-3 px-4">Tipo & Data</th>
                    <th className="py-3 px-3">Descrição do Lançamento</th>
                    <th className="py-3 px-3">Fornecedor / Doador</th>
                    <th className="py-3 px-3">Espécie / Categoria</th>
                    <th className="py-3 px-3">Nº Documento / NF</th>
                    <th className="py-3 px-3">Valor</th>
                    <th className="py-3 px-3">Comprovação</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                        Nenhum lançamento fiscal encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const proofMeta =
                        TSE_PROOF_STATUS_MAP[tx.proof_status] || TSE_PROOF_STATUS_MAP.comprovado
                      const isReceita = tx.type === 'receita'

                      return (
                        <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-white">
                            <div className="flex items-center gap-1.5">
                              <Badge
                                className={`text-[9px] font-black uppercase px-1.5 py-0 h-4 ${
                                  isReceita
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                }`}
                              >
                                {isReceita ? 'RECEITA' : 'DESPESA'}
                              </Badge>
                            </div>
                            <div className="text-[10px] text-slate-400 font-normal mt-0.5 font-mono">
                              {new Date(tx.transaction_date).toLocaleDateString('pt-BR')}
                            </div>
                          </td>

                          <td className="py-3.5 px-3 font-semibold text-slate-100 max-w-[200px]">
                            <div className="truncate">{tx.description}</div>
                            {tx.notes && (
                              <div className="text-[10px] text-slate-400 font-normal truncate">
                                💬 {tx.notes}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-3 text-slate-300">
                            <div className="font-medium text-slate-100">{tx.party_name}</div>
                            {tx.party_document && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                CPF/CNPJ: {tx.party_document}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-3 text-slate-300">
                            <span className="text-[11px] text-slate-200">
                              {TSE_CATEGORY_LABELS[tx.category] || tx.category}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 text-slate-300 font-mono text-[11px]">
                            {tx.document_number ? (
                              <Badge
                                variant="outline"
                                className="border-slate-700 text-slate-300 text-[10px]"
                              >
                                {tx.document_number}
                              </Badge>
                            ) : (
                              <span className="text-slate-500 italic">S/N</span>
                            )}
                          </td>

                          <td
                            className={`py-3.5 px-3 font-black font-mono text-sm ${
                              isReceita ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isReceita ? '+' : '-'} {formatBRL(tx.amount)}
                          </td>

                          <td className="py-3.5 px-3">
                            <Badge
                              className={`text-[10px] font-bold ${proofMeta.bg} ${proofMeta.color} border ${proofMeta.border}`}
                            >
                              {proofMeta.label}
                            </Badge>
                          </td>

                          <td className="py-3.5 px-4 text-right space-x-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-slate-400 hover:text-white"
                              onClick={() => handleOpenEditTx(tx)}
                              title="Editar lançamento"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
                              onClick={() => handleDeleteTx(tx.id)}
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ==========================================
            TAB 3: CHECKLIST DE OBRIGAÇÕES TRE / SPCE
           ========================================== */}
        <TabsContent value="deliveries" className="space-y-4">
          <Card className="bg-slate-900 border-slate-800 text-white shadow-md">
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-amber-400" />
                  Checklist & Calendário de Obrigações do TRE
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Acompanhe os prazos legais improrrogáveis para envio de relatórios de 72 horas,
                  prestação parcial e prestação final.
                </CardDescription>
              </div>

              <Button
                size="sm"
                onClick={handleOpenCreateDelivery}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-9 shrink-0"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> + Nova Obrigação TRE
              </Button>
            </div>

            <div className="p-4 space-y-3">
              {deliveries.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Nenhuma obrigação cadastrada no momento.
                </div>
              ) : (
                deliveries.map((del) => {
                  const statusMeta =
                    TSE_DELIVERY_STATUS_MAP[del.status] || TSE_DELIVERY_STATUS_MAP.pendente
                  const isDone = del.status === 'concluido'

                  return (
                    <div
                      key={del.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                        isDone
                          ? 'bg-emerald-950/20 border-emerald-500/30'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleDeliveryStatus(del)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center mt-0.5 shrink-0 transition-transform active:scale-90 ${
                            isDone
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-slate-800 border border-slate-700 text-slate-400 hover:border-amber-400'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4
                              className={`text-sm font-bold truncate ${
                                isDone ? 'text-emerald-300 line-through opacity-85' : 'text-white'
                              }`}
                            >
                              {del.title}
                            </h4>
                            <Badge className={`text-[10px] font-bold ${statusMeta.bg}`}>
                              {statusMeta.label}
                            </Badge>
                          </div>

                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                            {del.description || 'Sem descrição cadastrada.'}
                          </p>

                          <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400 flex-wrap">
                            <span className="flex items-center gap-1 text-amber-400 font-semibold">
                              <Calendar className="w-3.5 h-3.5" /> Prazo Legal:{' '}
                              {new Date(del.legal_deadline).toLocaleDateString('pt-BR')}
                            </span>
                            {del.delivered_at && (
                              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Entregue em:{' '}
                                {new Date(del.delivered_at).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                            {del.protocol_number && (
                              <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-200">
                                Protocolo: {del.protocol_number}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end md:self-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-800 w-full md:w-auto justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-slate-400 hover:text-white"
                          onClick={() => handleOpenEditDelivery(del)}
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
                          onClick={() => handleDeleteDelivery(del.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ==========================================
          MODAL: LANÇAMENTO DE TRANSAÇÃO (NOTA / DOAÇÃO)
         ========================================== */}
      <Dialog open={isTxModalOpen} onOpenChange={setIsTxModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-400" />
              {editingTx
                ? 'Editar Lançamento Fiscal'
                : txType === 'receita'
                  ? 'Registrar Doação de Campanha (Entrada)'
                  : 'Registrar Nota Fiscal / Gasto (Saída)'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Preencha os dados oficiais para prestação de contas no padrão exigido pelo TRE e SPCE.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTx} className="space-y-3.5 text-xs">
            {/* Type selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTxType('despesa')
                  if (!editingTx) {
                    setTxDocType('nota_fiscal')
                    setTxCategory('material_grafico')
                  }
                }}
                className={`p-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                  txType === 'despesa'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <TrendingDown className="w-4 h-4" /> Despesa / Nota Fiscal
              </button>

              <button
                type="button"
                onClick={() => {
                  setTxType('receita')
                  if (!editingTx) {
                    setTxDocType('recibo_eleitoral')
                    setTxCategory('doacao_pf')
                  }
                }}
                className={`p-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                  txType === 'receita'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <TrendingUp className="w-4 h-4" /> Doação / Receita
              </button>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-300">
                Descrição do Lançamento <span className="text-rose-400">*</span>
              </Label>
              <Input
                placeholder="Ex.: Impressão de 50.000 santinhos ou Doação via PIX"
                value={txDescription}
                onChange={(e) => setTxDescription(e.target.value)}
                required
                className="bg-slate-950 border-slate-700 text-slate-100 text-xs h-9"
              />
            </div>

            {/* Amount & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">
                  Valor (R$) <span className="text-rose-400">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  required
                  className="bg-slate-950 border-slate-700 text-slate-100 text-xs h-9 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">
                  Data do Evento <span className="text-rose-400">*</span>
                </Label>
                <Input
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  required
                  className="bg-slate-950 border-slate-700 text-slate-100 text-xs h-9"
                />
              </div>
            </div>

            {/* Category & Doc Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">
                  Espécie / Categoria SPCE <span className="text-rose-400">*</span>
                </Label>
                <Select value={txCategory} onValueChange={(v: any) => setTxCategory(v)}>
                  <SelectTrigger className="bg-slate-950 border-slate-700 text-slate-100 text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-100 max-h-56">
                    {Object.entries(TSE_CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key} className="text-xs">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">Tipo de Documento</Label>
                <Select value={txDocType} onValueChange={(v: any) => setTxDocType(v)}>
                  <SelectTrigger className="bg-slate-950 border-slate-700 text-slate-100 text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <SelectItem value="nota_fiscal">Nota Fiscal Eletrônica (NF-e)</SelectItem>
                    <SelectItem value="recibo_eleitoral">Recibo Eleitoral Oficial</SelectItem>
                    <SelectItem value="contrato">Contrato de Prestação de Serviços</SelectItem>
                    <SelectItem value="boleto">Boleto Bancário</SelectItem>
                    <SelectItem value="comprovante_pix">Comprovante PIX / TED</SelectItem>
                    <SelectItem value="outro">Outro Comprovante</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Party Name & Party Document */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">
                  {txType === 'receita' ? 'Nome do Doador' : 'Razão Social / Fornecedor'}{' '}
                  <span className="text-rose-400">*</span>
                </Label>
                <Input
                  placeholder="Ex.: Gráfica Central Ltda ou Nome da PF"
                  value={txPartyName}
                  onChange={(e) => setTxPartyName(e.target.value)}
                  required
                  className="bg-slate-950 border-slate-700 text-slate-100 text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">CPF ou CNPJ do Titular</Label>
                <Input
                  placeholder="00.000.000/0000-00 ou CPF"
                  value={txPartyDoc}
                  onChange={(e) => setTxPartyDoc(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-slate-100 text-xs h-9 font-mono"
                />
              </div>
            </div>

            {/* Doc number & Proof status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">Número da Nota Fiscal / Recibo</Label>
                <Input
                  placeholder="Ex.: NF-e 98402 ou REC-2026-001"
                  value={txDocNumber}
                  onChange={(e) => setTxDocNumber(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-slate-100 text-xs h-9 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">Status da Comprovação</Label>
                <Select value={txProofStatus} onValueChange={(v: any) => setTxProofStatus(v)}>
                  <SelectTrigger className="bg-slate-950 border-slate-700 text-slate-100 text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <SelectItem value="comprovado">Comprovado / Regular</SelectItem>
                    <SelectItem value="pendente_doc">Pendente de Comprovante</SelectItem>
                    <SelectItem value="em_analise">Em Análise Contábil</SelectItem>
                    <SelectItem value="divergente">Divergente / Alerta TRE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Upload File */}
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-300">
                Anexo do Documento Fiscal (PDF ou Foto)
              </Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setTxReceiptFile(e.target.files?.[0] || null)}
                className="bg-slate-950 border-slate-700 text-slate-100 text-xs h-9 file:bg-slate-800 file:text-slate-200 file:border-0 file:rounded file:text-xs file:mr-2"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-300">
                Observações Contábeis / Justificativa
              </Label>
              <Textarea
                placeholder="Observações complementares, número de protocolo ou detalhamento de entrega..."
                value={txNotes}
                onChange={(e) => setTxNotes(e.target.value)}
                rows={2}
                className="bg-slate-950 border-slate-700 text-slate-100 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsTxModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingTx}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                {isSavingTx
                  ? 'Salvando...'
                  : editingTx
                    ? 'Salvar Alterações'
                    : 'Registrar Lançamento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==========================================
          MODAL: OBRIGAÇÃO TRE / CHECKLIST
         ========================================== */}
      <Dialog open={isDeliveryModalOpen} onOpenChange={setIsDeliveryModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-amber-400" />
              {editingDelivery ? 'Editar Obrigação TRE' : 'Cadastrar Nova Obrigação no Checklist'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Controle de prazos e protocolos oficiais junto à Justiça Eleitoral.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDelivery} className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-300">
                Título da Obrigação <span className="text-rose-400">*</span>
              </Label>
              <Input
                placeholder="Ex.: Relatório Financeiro de 72 Horas - Semana 02"
                value={delTitle}
                onChange={(e) => setDelTitle(e.target.value)}
                required
                className="bg-slate-950 border-slate-700 text-slate-100 text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">
                  Prazo Legal Limite <span className="text-rose-400">*</span>
                </Label>
                <Input
                  type="date"
                  value={delDeadline}
                  onChange={(e) => setDelDeadline(e.target.value)}
                  required
                  className="bg-slate-950 border-slate-700 text-slate-100 text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">Tipo de Entrega</Label>
                <Select value={delType} onValueChange={(v: any) => setDelType(v)}>
                  <SelectTrigger className="bg-slate-950 border-slate-700 text-slate-100 text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <SelectItem value="relatorio_72h">Relatório 72 Horas</SelectItem>
                    <SelectItem value="parcial">Prestação de Contas Parcial</SelectItem>
                    <SelectItem value="prestacao_final">Prestação de Contas Final</SelectItem>
                    <SelectItem value="abertura_conta">Abertura de Contas</SelectItem>
                    <SelectItem value="extrato_bancario">Extratos Eletrônicos</SelectItem>
                    <SelectItem value="outro">Outro Protocolo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">Status Atual</Label>
                <Select value={delStatus} onValueChange={(v: any) => setDelStatus(v)}>
                  <SelectTrigger className="bg-slate-950 border-slate-700 text-slate-100 text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluido">Concluído / Protocolado</SelectItem>
                    <SelectItem value="em_atraso">Em Atraso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">Número de Protocolo TRE</Label>
                <Input
                  placeholder="Ex.: TRE-SP-2026-004812"
                  value={delProtocol}
                  onChange={(e) => setDelProtocol(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-slate-100 text-xs h-9 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-slate-300">
                Descrição / Instruções do Contador
              </Label>
              <Textarea
                placeholder="Detalhes dos documentos e demonstrativos que compõem este envio..."
                value={delDescription}
                onChange={(e) => setDelDescription(e.target.value)}
                rows={2}
                className="bg-slate-950 border-slate-700 text-slate-100 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDeliveryModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingDel}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                {isSavingDel ? 'Salvando...' : 'Salvar Obrigação'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
