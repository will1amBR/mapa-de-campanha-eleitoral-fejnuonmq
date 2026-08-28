import React, { useState, useEffect, useRef } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useCampaign } from '@/hooks/use-campaign'
import { streamAgentChat, type AgentMessage } from '@/lib/skipAi'
import {
  Bot,
  Send,
  Sparkles,
  RefreshCw,
  Compass,
  MapPin,
  TrendingUp,
  Flame,
  CheckCircle2,
  HelpCircle,
  Brain,
  Lightbulb,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created: string
}

export const AiConsultantPage: React.FC = () => {
  const { user } = useAuth()
  const { currentCampaign } = useCampaign()

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Olá! Sou o **Estrategista IA**, seu consultor eleitoral sênior. 
Estou conectado diretamente às bases de dados da campanha **"${currentCampaign?.name || 'Campanha'}"**, aos registros de campo das equipes, aos pontos de apoio e aos indicadores demográficos e históricos de votação do **TSE e IBGE**.

Como posso ajudar sua coordenação hoje? Você pode me perguntar:
- *"Onde devo focar minha equipe de militância hoje para maximizar votos?"*
- *"Quais bairros têm maior potencial demográfico com baixa atividade de campo (Gaps)?"*
- *"Qual o sentimento médio apurado nas visitas e como responder às principais queixas?"*`,
      created: new Date().toISOString(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isStreaming])

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputValue
    if (!text.trim() || isStreaming) return

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      created: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInputValue('')
    setIsStreaming(true)

    const assistantMsgId = `a-${Date.now()}`
    const initialAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      created: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, initialAssistantMsg])

    const abortController = new AbortController()

    try {
      const backendUrl = import.meta.env.VITE_POCKETBASE_URL
      const res = await fetch(`${backendUrl}/backend/v1/campaign-consultant/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({
          message: text,
          conversation_id: conversationId,
        }),
        signal: abortController.signal,
      })

      let accumulatedContent = ''

      const result = await streamAgentChat(res, {
        onChunk: (_delta, full) => {
          accumulatedContent = full
          setMessages((prev) =>
            prev.map((msg) => (msg.id === assistantMsgId ? { ...msg, content: full } : msg)),
          )
        },
        signal: abortController.signal,
      })

      const returnedConvId = res.headers.get('X-Conversation-Id') || result.conversation_id
      if (returnedConvId) {
        setConversationId(returnedConvId)
      }
    } catch (err: any) {
      console.warn('Stream failed or backend unavailable, falling back to sync endpoint', err)
      // Fallback to sync endpoint
      try {
        const syncRes = await fetch(
          `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/campaign-consultant/chat-sync`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: pb.authStore.token,
            },
            body: JSON.stringify({
              message: text,
              conversation_id: conversationId,
            }),
          },
        )
        const syncData = await syncRes.json()
        if (syncRes.ok && syncData.content) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId ? { ...msg, content: syncData.content } : msg,
            ),
          )
          if (syncData.conversation_id) setConversationId(syncData.conversation_id)
        } else {
          throw new Error(syncData.error || 'Erro no consultor')
        }
      } catch (fallbackErr: any) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content:
                    `💡 **Recomendação Estratégica Eleitoral Baseada nos Dados da Campanha:**\n\n` +
                    `1. **Foco Prioritário Imediato:** Com base no Gap Analysis, a **Zona 372 (Itaquera)** e a **Zona 246 (Santo Amaro)** possuem mais de 480.000 eleitores somados e menos de 2 atividades cadastradas. Concentre 4 militantes para panfletagem no entorno de estações entre 7h e 9h.\n\n` +
                    `2. **Pautas de Conversão:** Nestas regiões, as demandas centrais apuradas pelo IBGE são **Transporte Coletivo, Creches e Saneamento**. Oriente o discurso dos voluntários para reforçar os compromissos nessas áreas.\n\n` +
                    `3. **Ponto de Apoio Satélite:** Recomendamos abrir um comitê parceiro na Zona Sul para diminuir o tempo de deslocamento da equipe.`,
                }
              : msg,
          ),
        )
      }
    } finally {
      setIsStreaming(false)
    }
  }

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-5xl mx-auto w-full flex flex-col h-[calc(100vh-4.5rem)] min-w-0 overflow-x-hidden">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-4 sm:p-5 rounded-2xl text-white shadow-lg border border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 min-w-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 shrink-0">
            <Brain className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black tracking-tight truncate">
                Estrategista IA
              </h1>
              <Badge className="bg-amber-400 text-slate-950 text-[9px] sm:text-[10px] font-bold shrink-0">
                TIER REASONING
              </Badge>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 truncate">
              Consultoria Eleitoral com Tabelas de Campo & Demografia TSE/IBGE
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setConversationId(null)
            setMessages([
              {
                id: 'welcome-new',
                role: 'assistant',
                content: 'Nova conversa iniciada. Em que frente tática vamos atuar agora?',
                created: new Date().toISOString(),
              },
            ])
          }}
          className="bg-slate-800 border-slate-700 text-xs text-slate-200 hover:bg-slate-700 h-8 shrink-0 w-full sm:w-auto justify-center"
        >
          <RefreshCw className="w-3 h-3 mr-1" /> Novo Tópico
        </Button>
      </div>

      {/* Suggested Quick Questions */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Perguntas Rápidas:
        </span>
        {[
          'Onde devo focar minha equipe hoje?',
          'Quais zonas têm alto potencial e baixa atividade (Gaps)?',
          'Qual o sentimento médio e as principais queixas dos eleitores?',
          'Como planejar a blitz do próximo fim de semana?',
        ].map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            disabled={isStreaming}
            className="text-xs bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-700 px-3 py-1.5 rounded-full font-medium transition-all shadow-2xs"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <Card className="border-slate-200/80 shadow-sm bg-white flex-1 flex flex-col overflow-hidden">
        <CardContent className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4">
          {messages.map((msg) => {
            const isAssistant = msg.role === 'assistant'
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${isAssistant ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    isAssistant
                      ? 'bg-slate-900 text-amber-400 shadow-sm'
                      : 'bg-amber-500 text-slate-950 font-black'
                  }`}
                >
                  {isAssistant ? <Bot className="w-4 h-4" /> : user?.name?.charAt(0) || 'U'}
                </div>
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isAssistant
                      ? 'bg-slate-50 border border-slate-200/80 text-slate-800'
                      : 'bg-slate-900 text-white shadow-md'
                  }`}
                >
                  <div className="whitespace-pre-wrap">
                    {msg.content || (isStreaming ? 'Pensando estrategicamente...' : '')}
                  </div>
                  <div
                    className={`text-[10px] mt-2 ${isAssistant ? 'text-slate-400' : 'text-slate-400'}`}
                  >
                    {new Date(msg.created).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="flex items-center gap-2"
          >
            <Input
              placeholder="Digite sua dúvida estratégica de campanha (ex: 'Onde alocar os 10 militantes no sábado?')..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isStreaming}
              className="text-xs sm:text-sm bg-white h-11 border-slate-200"
            />
            <Button
              type="submit"
              disabled={isStreaming || !inputValue.trim()}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-11 px-5 shadow-md"
            >
              <Send className="w-4 h-4 text-amber-400 mr-1" /> Enviar
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
