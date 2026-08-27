routerAdd(
  'POST',
  '/backend/v1/campaign-consultant/chat-sync',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const userId = e.auth?.id
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária')
      }
      if (!body.message || !body.message.trim()) {
        return e.badRequestError('Mensagem é obrigatória')
      }

      const result = $ai.agent('campaign-consultant').chat({
        user_id: userId,
        conversation_id: body.conversation_id || null,
        message: body.message,
      })

      return e.json(200, {
        conversation_id: result.conversation_id,
        content: result.content,
        citations: result.citations,
        message_id: result.message_id,
      })
    } catch (err) {
      if (err instanceof SkipAiConfigError)
        return e.json(503, { error: 'Serviço de IA não configurado' })
      if (err instanceof SkipAiAgentsError) {
        const status = err.status || 500
        return e.json(status, { error: status >= 500 ? 'Erro no agente de IA' : err.message })
      }
      if (err instanceof SkipAiError) {
        const status = err.status || 502
        return e.json(status, {
          error: status >= 500 ? 'IA temporariamente indisponível' : err.message,
        })
      }
      throw err
    }
  },
  $apis.requireAuth(),
)
