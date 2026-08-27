import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Compass, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('william@korenambiental.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)

    if (error) {
      toast.error('Credenciais inválidas. Verifique seu email e senha.')
    } else {
      toast.success('Bem-vindo ao Estrategista Eleitoral!')
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      {/* Background radial highlight */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-amber-500 items-center justify-center text-slate-950 shadow-xl shadow-amber-500/20 mb-2">
            <Compass className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Estrategista <span className="text-amber-400">Eleitoral</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Inteligência Geoespacial, Rastreamento Híbrido & Dados TSE/IBGE
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-800 bg-slate-900/90 backdrop-blur-md shadow-2xl text-slate-100">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-white">
              Acessar Painel de Campanha
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Digite suas credenciais de coordenador ou membro de equipe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Email Corporativo</Label>
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

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-300">Senha</Label>
                  <Link
                    to="/forgot-password"
                    className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
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

              {/* Seed quick-login notice */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  Conta Admin padrão carregada: <strong>william@korenambiental.com</strong>
                </span>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold h-10 text-xs shadow-lg shadow-amber-500/20"
              >
                {loading ? 'Validando...' : 'Entrar na Plataforma'}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-400">
              Não possui uma conta?{' '}
              <Link to="/signup" className="text-amber-400 font-bold hover:underline">
                Cadastrar Novo Coordenador
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
