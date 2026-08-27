// Typed helpers for hooks proxying $ai.chat (OpenAI-shape) and
// $ai.agent(slug).chat (Skip-shape). Don't hand-roll the SSE reader —
// past attempts shipped "undefinedundefined…" and "[object Object]…".

export interface OpenAIChatResult {
  id: string
  model: string
  choices: Array<{
    index: number
    message: { role: string; content: string; tool_calls?: unknown[] }
    finish_reason: string
  }>
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

export interface AgentCitation {
  n: number
  chunk_id: string
  source_id: string
  distance: number
  excerpt: string
}

export interface AgentChatResult {
  content: string
  conversation_id: string
  message_id: string
  citations?: AgentCitation[]
  tool_calls?: Array<{ name: string; id: string }>
  iterations: number
}

// Raw `listMessages` row (full audit trail — pipe through displayableMessages for the streamed view).
export interface AgentMessage {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: unknown
  tool_call_id?: string
  citations?: AgentCitation[]
  created: string
}

export interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: AgentCitation[]
  created: string
}

export interface OpenAIChatStreamChunk {
  id?: string
  model?: string
  choices: Array<{
    index: number
    delta: { role?: string; content?: string; tool_calls?: unknown[] }
    finish_reason?: string | null
  }>
}

export type AgentChatStreamEvent =
  | { type: 'chunk'; content: string }
  | { type: 'tool_call_start'; id: string; name: string }
  | { type: 'tool_call_done'; id: string; ok: boolean }
  | { type: 'citations'; items: AgentCitation[] }
  | { type: 'done'; conversation_id: string; message_id: string }
  | { type: 'error'; message: string }

interface SseBlock {
  event: string
  data: string
}

async function* readSseBlocks(
  response: Response,
  signal?: AbortSignal,
): AsyncGenerator<SseBlock> {
  if (!response.body) return
  const reader = response.body.getReader()
  // Wire abort directly into the reader. reader.cancel(reason) makes
  // the in-flight read() reject with `reason` AND tears down the
  // underlying connection, so a stalled stream interrupts immediately
  // — not just on the next yielded event.
  const onAbort = () => {
    reader.cancel(signal?.reason).catch(() => {})
  }
  if (signal?.aborted) onAbort()
  signal?.addEventListener('abort', onAbort)
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
      const blocks = buffer.split('\n\n')
      buffer = blocks.pop() ?? ''
      for (const block of blocks) {
        const parsed = parseSseBlock(block)
        if (parsed) yield parsed
      }
    }
    // Flush trailing multibyte char + any block missing the final blank line.
    buffer += decoder.decode().replace(/\r\n/g, '\n')
    if (buffer.trim()) {
      const parsed = parseSseBlock(buffer)
      if (parsed) yield parsed
    }
  } finally {
    signal?.removeEventListener('abort', onAbort)
    reader.releaseLock()
  }
}

function parseSseBlock(raw: string): SseBlock | null {
  let event = 'message'
  const dataLines: string[] = []
  for (const rawLine of raw.split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    if (!line || line.startsWith(':')) continue
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''))
  }
  if (dataLines.length === 0) return null
  return { event, data: dataLines.join('\n') }
}

function isAgentCitation(v: unknown): v is AgentCitation {
  if (!v || typeof v !== 'object') return false
  const c = v as Record<string, unknown>
  return (
    typeof c.n === 'number' &&
    typeof c.chunk_id === 'string' &&
    typeof c.source_id === 'string' &&
    typeof c.distance === 'number' &&
    typeof c.excerpt === 'string'
  )
}

function narrowCitations(v: unknown): AgentCitation[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out = v.filter(isAgentCitation)
  return out.length > 0 ? out : undefined
}

// Filter `listMessages` to match the streamed view (drops empty-content tool-call assistants and role:'tool' rows).
// `includeToolTrail: true` keeps the raw audit trail — for debugging.
export function displayableMessages(
  messages: AgentMessage[],
  opts: { includeToolTrail?: boolean } = {},
): DisplayMessage[] {
  return messages
    .filter((m) => {
      if (opts.includeToolTrail) return m.role !== undefined
      if (m.role === 'user') return true
      if (m.role === 'assistant') return typeof m.content === 'string' && m.content.length > 0
      return false
    })
    .map((m) => ({
      id: m.id,
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
      citations: narrowCitations(m.citations),
      created: m.created,
    }))
}

function isOpenAIChatStreamChunk(v: unknown): v is OpenAIChatStreamChunk {
  if (!v || typeof v !== 'object') return false
  const c = (v as { choices?: unknown }).choices
  if (!Array.isArray(c)) return false
  return c.every((choice) => {
    if (!choice || typeof choice !== 'object') return false
    const ch = choice as Record<string, unknown>
    return typeof ch.index === 'number' && !!ch.delta && typeof ch.delta === 'object'
  })
}

// Iterate $ai.chat({stream:true}) chunks. Skips the [DONE] sentinel
// AND any malformed payload — the contract says callers receive only
// well-formed OpenAIChatStreamChunk objects.
// Pass an AbortSignal to cancel a stalled read mid-stream.
export async function* parseChatStream(
  response: Response,
  signal?: AbortSignal,
): AsyncGenerator<OpenAIChatStreamChunk> {
  for await (const block of readSseBlocks(response, signal)) {
    if (!block.data || block.data === '[DONE]') continue
    let parsed: unknown
    try {
      parsed = JSON.parse(block.data)
    } catch {
      continue
    }
    if (isOpenAIChatStreamChunk(parsed)) yield parsed
  }
}

// Iterate $ai.agent(slug).chat({stream:true}) events as a discriminated union.
// Unknown event types are skipped so newer agent versions stay backward-compatible.
export async function* parseAgentChatStream(
  response: Response,
  signal?: AbortSignal,
): AsyncGenerator<AgentChatStreamEvent> {
  for await (const block of readSseBlocks(response, signal)) {
    if (!block.data) continue
    let parsed: unknown
    try {
      parsed = JSON.parse(block.data)
    } catch {
      continue
    }
    switch (block.event) {
      case 'chunk': {
        const v = parsed as { content?: unknown }
        if (typeof v?.content === 'string') yield { type: 'chunk', content: v.content }
        break
      }
      case 'tool_call_start': {
        const v = parsed as { id?: unknown; name?: unknown }
        if (typeof v?.id === 'string' && typeof v?.name === 'string') {
          yield { type: 'tool_call_start', id: v.id, name: v.name }
        }
        break
      }
      case 'tool_call_done': {
        const v = parsed as { id?: unknown; ok?: unknown }
        if (typeof v?.id === 'string' && typeof v?.ok === 'boolean') {
          yield { type: 'tool_call_done', id: v.id, ok: v.ok }
        }
        break
      }
      case 'citations': {
        const items = narrowCitations(parsed)
        if (items) yield { type: 'citations', items }
        break
      }
      case 'done': {
        const v = parsed as { conversation_id?: unknown; message_id?: unknown }
        if (typeof v?.conversation_id === 'string' && typeof v?.message_id === 'string') {
          yield { type: 'done', conversation_id: v.conversation_id, message_id: v.message_id }
        }
        break
      }
      case 'error': {
        const v = parsed as { message?: unknown }
        const msg = typeof v?.message === 'string' ? v.message : 'unknown error'
        yield { type: 'error', message: msg }
        break
      }
    }
  }
}

export interface StreamAgentChatHandlers {
  onChunk?: (deltaText: string, accumulatedText: string) => void
  onToolCallStart?: (info: { id: string; name: string }) => void
  onToolCallDone?: (info: { id: string; ok: boolean }) => void
  onCitations?: (items: AgentCitation[]) => void
  onError?: (message: string) => void
  signal?: AbortSignal
}

export interface StreamAgentChatResult {
  content: string
  conversation_id: string
  message_id: string
  citations?: AgentCitation[]
  toolCalls: Array<{ id: string; name: string; ok: boolean }>
}

// Drive an agent stream end-to-end. Resolves only after `done` (turn fully persisted);
// throws on abort, on the `error` event, or if the stream ends before `done`.
export async function streamAgentChat(
  response: Response,
  handlers: StreamAgentChatHandlers = {},
): Promise<StreamAgentChatResult> {
  // Non-200 responses come back as JSON, not SSE — falling through to
  // the parser would surface them as the unhelpful "stream ended
  // before done event" instead of the real auth/validation message.
  if (!response.ok) {
    let message = `Agent chat failed: ${response.status}`
    try {
      const body = (await response.clone().json()) as { message?: unknown; error?: unknown }
      if (typeof body.message === 'string') message = body.message
      else if (typeof body.error === 'string') message = body.error
    } catch {
      const text = await response.text().catch(() => '')
      if (text.trim()) message = text
    }
    throw new Error(message)
  }

  let content = ''
  let conversationId = ''
  let messageId = ''
  let citations: AgentCitation[] | undefined
  let sawDone = false
  const toolCallNames = new Map<string, string>()
  const toolCalls: StreamAgentChatResult['toolCalls'] = []

  const abortError = (): Error =>
    handlers.signal?.reason instanceof Error
      ? handlers.signal.reason
      : new DOMException('The operation was aborted', 'AbortError')

  // If the signal is already tripped before the iterator yields its
  // first event (or after the loop exits), the in-loop check below
  // never runs and we'd misclassify cancellation as "stream ended
  // before done". Bracket the loop with explicit checks.
  if (handlers.signal?.aborted) throw abortError()

  for await (const event of parseAgentChatStream(response, handlers.signal)) {
    if (handlers.signal?.aborted) throw abortError()
    switch (event.type) {
      case 'chunk':
        content += event.content
        handlers.onChunk?.(event.content, content)
        break
      case 'tool_call_start':
        toolCallNames.set(event.id, event.name)
        handlers.onToolCallStart?.({ id: event.id, name: event.name })
        break
      case 'tool_call_done':
        toolCalls.push({
          id: event.id,
          name: toolCallNames.get(event.id) ?? '',
          ok: event.ok,
        })
        handlers.onToolCallDone?.({ id: event.id, ok: event.ok })
        break
      case 'citations':
        citations = event.items
        handlers.onCitations?.(event.items)
        break
      case 'done':
        sawDone = true
        conversationId = event.conversation_id
        messageId = event.message_id
        break
      case 'error':
        handlers.onError?.(event.message)
        throw new Error(event.message)
    }
  }

  if (handlers.signal?.aborted) throw abortError()
  if (!sawDone) {
    throw new Error('Agent stream ended before the done event')
  }

  return { content, conversation_id: conversationId, message_id: messageId, citations, toolCalls }
}
