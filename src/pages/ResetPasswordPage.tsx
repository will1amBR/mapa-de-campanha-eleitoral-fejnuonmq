import React, { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Compass, Lock, Mail, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

export const ResetPasswordPage: React.FC = () => {
  const { confirmPasswordReset } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      toast.error('Token de redefinição não encontrado.')
      return
    }
    if (password !== passwordConfirm) {
      toast.error('As senhas digitadas não coincidem.')
      return
    }

    setLoading(true)
    const { error } = await confirmPasswordReset(token, password)
    setLoading(false)

    if (error) {
      toast.error(error.message || 'Erro ao redefinir senha.')
    } else {
      setSuccess(true)
      toast.success('Senha alterada com sucesso!')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-amber-500 items-center justify-center text-slate-950 shadow-xl mb-2">
            <Compass className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black text-white">Criar Nova Senha</h1>
        </div>

        <Card className="border-slate-800 bg-slate-900 shadow-2xl text-slate-100">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-white">Redefinição Segura</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Digite e confirme sua nova senha de acesso à campanha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-300">
                  Sua senha foi redefinida com sucesso. Faça login agora.
                </p>
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-10"
                >
                  Ir para Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">Nova Senha</Label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-slate-800/80 border-slate-700 text-white pl-9 text-xs h-10"
                      placeholder="••••••••"
                      minLength={8}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">
                    Confirmar Nova Senha
                  </Label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <Input
                      type="password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      className="bg-slate-800/80 border-slate-700 text-white pl-9 text-xs h-10"
                      placeholder="••••••••"
                      minLength={8}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold h-10 text-xs shadow-lg"
                >
                  {loading ? 'Salvando Senha...' : 'Confirmar Nova Senha'}
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
