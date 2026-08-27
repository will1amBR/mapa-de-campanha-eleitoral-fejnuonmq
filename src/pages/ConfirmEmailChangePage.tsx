import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Compass, Lock, CheckCircle2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

export const ConfirmEmailChangePage: React.FC = () => {
  const { confirmEmailChange } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      toast.error('Token de troca de email ausente.')
      return
    }

    setLoading(true)
    const { error } = await confirmEmailChange(token, password)
    setLoading(false)

    if (error) {
      toast.error(error.message || 'Erro ao confirmar alteração de email.')
    } else {
      setSuccess(true)
      toast.success('Email alterado com sucesso! Faça login com as novas credenciais.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-amber-500 items-center justify-center text-slate-950 shadow-xl mb-2">
            <Compass className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black text-white">Confirmar Novo Email</h1>
        </div>

        <Card className="border-slate-800 bg-slate-900 shadow-2xl text-slate-100">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-white">
              Confirmação de Segurança
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Digite sua senha atual para autorizar a troca definitiva de email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-300">
                  Email atualizado com sucesso! Por segurança, sua sessão anterior foi encerrada.
                </p>
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-10"
                >
                  Entrar com Novo Email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">Senha Atual</Label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-slate-800/80 border-slate-700 text-white pl-9 text-xs h-10"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold h-10 text-xs shadow-lg"
                >
                  {loading ? 'Confirmando...' : 'Confirmar Troca de Email'}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
