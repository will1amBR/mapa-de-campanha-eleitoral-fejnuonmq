routerAdd(
  'GET',
  '/backend/v1/campaign-consultant/conversations',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')
    const limit = parseInt(e.requestInfo().query?.limit || '20', 10) || 20
    return e.json(
      200,
      $ai.agent('campaign-consultant').listConversations({ user_id: userId, limit }),
    )
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/campaign-consultant/conversations/{conversationId}/messages',
  (e) => {
    try {
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('auth required')
      return e.json(
        200,
        $ai.agent('campaign-consultant').listMessages({
          conversation_id: e.request.pathValue('conversationId'),
          user_id: userId,
        }),
      )
    } catch (err) {
      if (err instanceof SkipAiAgentsError) {
        const status = err.status || 500
        return e.json(status, {
          error: status >= 500 ? 'Falha na busca de mensagens' : err.message,
        })
      }
      throw err
    }
  },
  $apis.requireAuth(),
)
