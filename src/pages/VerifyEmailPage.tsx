import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Compass, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export const VerifyEmailPage: React.FC = () => {
  const { confirmVerification } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const token = searchParams.get('token')
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>(
    token ? 'verifying' : 'error',
  )
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMessage('Nenhum token de verificação foi fornecido na URL.')
      return
    }

    const verify = async () => {
      const { error } = await confirmVerification(token)
      if (error) {
        setStatus('error')
        setErrorMessage(error.message || 'Token inválido ou já utilizado.')
      } else {
        setStatus('success')
      }
    }

    verify()
  }, [token, confirmVerification])

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-amber-500 items-center justify-center text-slate-950 shadow-xl mb-2">
            <Compass className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black text-white">Verificação de Email</h1>
        </div>

        <Card className="border-slate-800 bg-slate-900 shadow-2xl text-slate-100">
          <CardHeader className="text-center pb-4">
            {status === 'verifying' && (
              <>
                <CardTitle className="text-base font-bold text-white">
                  Confirmando Email...
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Aguarde enquanto validamos seu token de segurança.
                </CardDescription>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <CardTitle className="text-base font-bold text-emerald-400">
                  Email Verificado com Sucesso!
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-1">
                  Sua conta está 100% ativa e pronta para uso nas campanhas eleitorais.
                </CardDescription>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-2">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <CardTitle className="text-base font-bold text-rose-400">
                  Falha na Verificação
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-1">
                  {errorMessage || 'O link de verificação expirou ou é inválido.'}
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="pt-2">
            {status === 'success' ? (
              <Button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-10"
              >
                Ir para o Painel <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={() => navigate('/login')}
                variant="outline"
                className="w-full bg-slate-800 text-white border-slate-700 text-xs h-10"
              >
                Voltar para o Login
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
