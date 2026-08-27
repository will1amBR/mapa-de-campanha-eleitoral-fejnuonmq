import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Compass, Mail, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

export const ForgotPasswordPage: React.FC = () => {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    const { error } = await requestPasswordReset(email.trim())
    setLoading(false)

    if (error) {
      toast.error(error.message || 'Erro ao enviar email de recuperação.')
    } else {
      setSubmitted(true)
      toast.success('Link de recuperação enviado com sucesso!')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-amber-500 items-center justify-center text-slate-950 shadow-xl mb-2">
            <Compass className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black text-white">Recuperar Senha</h1>
        </div>

        <Card className="border-slate-800 bg-slate-900 shadow-2xl text-slate-100">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-white">Esqueceu sua senha?</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Digite seu email corporativo cadastrado para receber instruções de recuperação.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-300">
                  Enviamos um email para <strong>{email}</strong> com as instruções para redefinir
                  sua senha.
                </p>
                <Link to="/login">
                  <Button className="w-full mt-2 bg-amber-500 text-slate-950 font-bold text-xs h-10">
                    Voltar para Login
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">Email Cadastrado</Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-slate-800/80 border-slate-700 text-white pl-9 text-xs h-10"
                      placeholder="seuemail@campanha.com.br"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold h-10 text-xs shadow-lg"
                >
                  {loading ? 'Enviando email...' : 'Enviar Link de Redefinição'}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>

                <div className="text-center pt-2">
                  <Link
                    to="/login"
                    className="text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    ← Voltar para a tela de login
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
