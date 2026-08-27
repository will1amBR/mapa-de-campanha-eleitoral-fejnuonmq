import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Compass, Lock, Mail, User, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

export const SignupPage: React.FC = () => {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('coordinator')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await signUp(email, password, name, role)
    setLoading(false)

    if (error) {
      toast.error(error.message || 'Erro ao registrar usuário')
    } else {
      toast.success('Conta criada com sucesso! Verifique seu email para confirmação.')
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-amber-500 items-center justify-center text-slate-950 shadow-xl shadow-amber-500/20 mb-2">
            <Compass className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Criar Nova Conta
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Cadastre-se para gerenciar equipes, comitês e zonas eleitorais
          </p>
        </div>

        <Card className="border-slate-800 bg-slate-900/90 backdrop-blur-md shadow-2xl text-slate-100">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-white">
              Cadastro de Operador de Campanha
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Preencha os dados da coordenação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Nome Completo</Label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-slate-800/80 border-slate-700 text-white pl-9 text-xs h-10"
                    placeholder="Seu nome"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Email Corporativo</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-800/80 border-slate-700 text-white pl-9 text-xs h-10"
                    placeholder="email@campanha.com.br"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Função / Cargo</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="bg-slate-800/80 border-slate-700 text-white text-xs h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="admin">Coordenador Geral (Admin)</SelectItem>
                    <SelectItem value="coordinator">Coordenador de Zona / Bairro</SelectItem>
                    <SelectItem value="field_team">Militante / Agente de Campo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">
                  Senha de Acesso (Mín. 8 dígitos)
                </Label>
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

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold h-10 text-xs shadow-lg shadow-amber-500/20"
              >
                {loading ? 'Criando Conta...' : 'Cadastrar na Plataforma'}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-400">
              Já possui uma conta?{' '}
              <Link to="/login" className="text-amber-400 font-bold hover:underline">
                Fazer Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
