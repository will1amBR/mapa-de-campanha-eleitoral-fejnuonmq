routerAdd(
  'POST',
  '/backend/v1/campaign-consultant/ask',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const userId = e.auth?.id
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária para consultar o Estrategista IA')
      }
      if (!body.message || !body.message.trim()) {
        return e.badRequestError('Mensagem não pode ser vazia')
      }

      const conv = $ai.agent('campaign-consultant').getOrCreateConversation({
        user_id: userId,
        id: body.conversation_id || null,
        title: body.message.slice(0, 50),
      })

      const iter = $ai.agent('campaign-consultant').chat({
        user_id: userId,
        conversation_id: conv.id,
        message: body.message,
        stream: true,
      })

      e.response.header().set('Content-Type', 'text/event-stream')
      e.response.header().set('Cache-Control', 'no-cache')
      e.response.header().set('X-Conversation-Id', conv.id)
      $response.stream(e, iter)
    } catch (err) {
      if (err instanceof SkipAiConfigError) {
        return e.json(503, { error: 'Serviço de IA temporariamente indisponível' })
      }
      if (err instanceof SkipAiAgentsError) {
        const status = err.status || 500
        return e.json(status, {
          error: status >= 500 ? 'Falha na solicitação do consultor' : err.message,
        })
      }
      if (err instanceof SkipAiError) {
        const status = err.status || 502
        return e.json(status, { error: status >= 500 ? 'Falha no serviço de IA' : err.message })
      }
      throw err
    }
  },
  $apis.requireAuth(),
)
