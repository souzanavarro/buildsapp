import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, Loader2, Mail, Lock, User, Phone, Zap, Globe, Clock, Smartphone, Apple, ShieldCheck, Star, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { PremiumCard } from "@/components/ui/premium-card";

export const Route = createFileRoute("/auth")({ component: AuthPage });

type AuthMode = "signin" | "signup" | "forgot-password";

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  
  // Security: Brute force protection simulation
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone || document.referrer.includes('android-app://');
    setIsStandalone(isStandaloneMode);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const checkLockout = () => {
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remainingSeconds = Math.ceil((lockoutUntil - Date.now()) / 1000);
      toast.error(`Muitas tentativas. Tente novamente em ${remainingSeconds} segundos.`);
      return true;
    }
    return false;
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkLockout()) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setLoading(false);
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      
      if (newAttempts >= 5) {
        const lockoutTime = Date.now() + 60 * 1000; // 1 minute lockout
        setLockoutUntil(lockoutTime);
        toast.error("Muitas tentativas falhas. Bloqueio temporário ativado.");
      } else {
        toast.error(error.message);
      }
      return;
    }

    setLoginAttempts(0);
    setLockoutUntil(null);
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/dashboard", replace: true });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin + "/auth",
        data: { full_name: name, phone },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Confirme seu e-mail para entrar.");
    setMode("signin");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/auth?reset=true",
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("E-mail de recuperação enviado!");
    setMode("signin");
  };

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row bg-background selection:bg-primary/30 overflow-x-hidden">
      {/* Visual Side - Desktop Premium Experience */}
      <div className="hidden lg:flex lg:w-[50%] bg-black relative overflow-hidden items-center justify-center p-12 xl:p-20 border-r border-white/5">
        <div className="absolute inset-0 z-0">
           {/* Abstract Premium Background Elements */}
           <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-primary/20 rounded-full blur-[160px] animate-pulse duration-[12s]" />
           <div className="absolute bottom-[-5%] left-[-5%] w-[50%] h-[50%] bg-amber-500/10 rounded-full blur-[140px]" />
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
           
           {/* Moving Grid lines */}
           <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
                style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>

        <div className="relative z-10 max-w-2xl w-full">
          <div className="mb-14 inline-flex items-center gap-4 bg-white/[0.03] px-6 py-3 rounded-[2rem] border border-white/[0.1] backdrop-blur-3xl">
            <div className="h-10 w-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-2xl shadow-primary/40">
               <Truck className="h-6 w-6 text-white" />
            </div>
            <div className="flex flex-col">
               <span className="text-[10px] font-black text-white/40 tracking-[0.4em] uppercase leading-none mb-1">Rota Certa</span>
               <span className="text-xs font-black text-white/90 tracking-tight">Enterprise Edition</span>
            </div>
          </div>
          
          <h1 className="text-6xl xl:text-[84px] font-black text-white tracking-tighter leading-[0.85] mb-14">
             Logística de <br />
             <span className="text-brand-gradient">alta performance</span> <br />
             começa <span className="text-white/40 italic">aqui.</span>
          </h1>
          
          <div className="grid grid-cols-1 gap-8">
             {[
               { icon: Zap, title: "Inteligência Operacional", desc: "IA avançada para roteirização e processamento de planilhas Shopee/SPX." },
               { icon: ShieldCheck, title: "Segurança de Dados", desc: "Criptografia ponta-a-ponta e conformidade total com padrões enterprise." },
               { icon: Star, title: "Lucratividade Máxima", desc: "Redução de custos operacionais em até 40% com otimização inteligente." }
             ].map((item, i) => (
               <div key={i} className="flex gap-6 group cursor-default">
                  <div className="h-14 w-14 shrink-0 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-primary transition-all duration-500 group-hover:bg-primary/20 group-hover:text-white group-hover:scale-110 shadow-inner">
                     <item.icon className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                     <h3 className="text-xl font-bold text-white/95 group-hover:text-primary transition-colors">{item.title}</h3>
                     <p className="text-white/40 font-medium leading-relaxed max-w-sm">{item.desc}</p>
                  </div>
               </div>
             ))}
          </div>
        </div>

        <div className="absolute bottom-12 left-12 flex items-center gap-6 text-[10px] font-black text-white/20 uppercase tracking-[0.5em]">
           <span>© 2026 Rota Certa Pro</span>
           <div className="h-1 w-1 rounded-full bg-white/10" />
           <span>Trusted by 10k+ Drivers</span>
        </div>
      </div>

      {/* Auth Side - Clean & Focused */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 xs:p-8 sm:p-12 xl:p-16 relative bg-background">
        <div className="w-full max-w-[480px]">
          {/* Mobile Header */}
          <div className="lg:hidden mb-12 flex flex-col items-center text-center">
            <div className="bg-brand-gradient rounded-[2rem] p-5 shadow-2xl shadow-primary/30 mb-6">
              <Truck className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter mb-2">Rota Certa Pro</h1>
            <p className="text-muted-foreground font-bold uppercase tracking-[0.2em] text-[10px]">Logística Enterprise</p>
          </div>

          <PremiumCard className="p-0 border-border/10 shadow-premium overflow-hidden">
            <AnimatePresence mode="wait">
              {mode === "forgot-password" ? (
                <motion.div 
                  key="forgot"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-8 sm:p-12"
                >
                  <button 
                    onClick={() => setMode("signin")}
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8 text-xs font-black uppercase tracking-widest"
                  >
                    <ArrowLeft className="h-4 w-4" /> Voltar ao Login
                  </button>

                  <div className="mb-10">
                    <h2 className="text-3xl font-black tracking-tighter mb-2">Recuperar Senha</h2>
                    <p className="text-sm text-muted-foreground font-medium">Enviaremos um link de recuperação para o seu e-mail.</p>
                  </div>

                  <form onSubmit={handleResetPassword} className="space-y-8">
                    <div className="space-y-3">
                      <Label htmlFor="reset-email" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Seu E-mail</Label>
                      <div className="relative group/input">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                        <Input 
                          id="reset-email" 
                          type="email" 
                          placeholder="seu-email@exemplo.com"
                          className="pl-14 h-16 rounded-2xl bg-muted/30 border-none focus-visible:ring-2 focus-visible:ring-primary/40 font-bold" 
                          required 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                        />
                      </div>
                    </div>

                    <Button variant="premium" type="submit" className="w-full h-16 rounded-[1.5rem]" disabled={loading}>
                      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Enviar Instruções"}
                    </Button>
                  </form>
                </motion.div>
              ) : (
                <Tabs defaultValue={mode} value={mode} onValueChange={(v) => setMode(v as AuthMode)} className="w-full">
                  <div className="bg-muted/10 p-4 border-b border-border/10">
                    <TabsList className="grid w-full grid-cols-2 p-1.5 bg-background/50 rounded-[1.5rem]">
                      <TabsTrigger value="signin" className="rounded-2xl font-black uppercase tracking-widest text-[10px] py-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg shadow-primary/20 transition-all">
                        Acessar
                      </TabsTrigger>
                      <TabsTrigger value="signup" className="rounded-2xl font-black uppercase tracking-widest text-[10px] py-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg shadow-primary/20 transition-all">
                        Criar Conta
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="p-8 sm:p-12">
                    <TabsContent value="signin" className="mt-0 focus-visible:outline-none">
                      <div className="mb-10">
                        <h2 className="text-3xl font-black tracking-tighter mb-2">Seja Bem-vindo</h2>
                        <p className="text-sm text-muted-foreground font-medium">Acesse sua central de inteligência logística.</p>
                      </div>

                      <form onSubmit={signIn} className="space-y-6">
                        <div className="space-y-3">
                          <Label htmlFor="email-in" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Credenciais</Label>
                          <div className="relative group/input">
                            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                            <Input 
                              id="email-in" 
                              type="email" 
                              placeholder="exemplo@gmail.com"
                              className="pl-14 h-16 rounded-2xl bg-muted/30 border-none focus-visible:ring-2 focus-visible:ring-primary/40 font-bold transition-all" 
                              required 
                              value={email} 
                              onChange={(e) => setEmail(e.target.value)} 
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between items-center ml-2">
                            <Label htmlFor="pwd-in" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Senha</Label>
                            <button 
                              type="button" 
                              onClick={() => setMode("forgot-password")}
                              className="text-[10px] font-black text-primary hover:text-primary/70 transition-colors uppercase tracking-widest"
                            >
                              Esqueci a senha
                            </button>
                          </div>
                          <div className="relative group/input">
                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                            <Input 
                              id="pwd-in" 
                              type="password" 
                              placeholder="••••••••"
                              className="pl-14 h-16 rounded-2xl bg-muted/30 border-none focus-visible:ring-2 focus-visible:ring-primary/40 font-bold transition-all" 
                              required 
                              value={password} 
                              onChange={(e) => setPassword(e.target.value)} 
                            />
                          </div>
                        </div>

                        <Button variant="premium" type="submit" className="w-full h-16 rounded-[1.5rem] mt-4" disabled={loading}>
                          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                            <span className="flex items-center gap-3">
                               Iniciar Sessão <ArrowRight className="h-5 w-5" />
                            </span>
                          )}
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="signup" className="mt-0 focus-visible:outline-none">
                      <div className="mb-10">
                        <h2 className="text-3xl font-black tracking-tighter mb-2">Comece Agora</h2>
                        <p className="text-sm text-muted-foreground font-medium">Junte-se à maior rede de entregas profissionais.</p>
                      </div>

                      <form onSubmit={signUp} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Nome</Label>
                            <Input 
                              id="name" 
                              placeholder="Nome"
                              className="h-14 rounded-2xl bg-muted/30 border-none font-bold"
                              required 
                              value={name} 
                              onChange={(e) => setName(e.target.value)} 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">WhatsApp</Label>
                            <Input 
                              id="phone" 
                              className="h-14 rounded-2xl bg-muted/30 border-none font-bold"
                              placeholder="(00) 00000-0000"
                              value={phone} 
                              onChange={(e) => setPhone(e.target.value)} 
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email-up" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">E-mail</Label>
                          <Input 
                            id="email-up" 
                            type="email" 
                            placeholder="seu@email.com"
                            className="h-14 rounded-2xl bg-muted/30 border-none font-bold"
                            required 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="pwd-up" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Senha</Label>
                          <Input 
                            id="pwd-up" 
                            type="password" 
                            placeholder="Mínimo 6 caracteres"
                            className="h-14 rounded-2xl bg-muted/30 border-none font-bold"
                            required 
                            minLength={6} 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                          />
                        </div>

                        <Button variant="premium" type="submit" className="w-full h-16 rounded-[1.5rem] mt-6" disabled={loading}>
                          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Finalizar Cadastro"}
                        </Button>
                      </form>
                    </TabsContent>
                  </div>
                </Tabs>
              )}
            </AnimatePresence>
          </PremiumCard>

          {/* Download App Widget */}
          {!isStandalone && (
            <div className="mt-12 w-full animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-500">
              <div className="flex items-center gap-4 mb-8">
                 <div className="h-px bg-border/40 flex-1" />
                 <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.4em]">Experiência Mobile Nativa</span>
                 <div className="h-px bg-border/40 flex-1" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-16 rounded-2xl border-border/10 hover:border-primary/40 hover:bg-primary/5 transition-all gap-4 group/btn"
                  onClick={deferredPrompt ? handleInstallClick : () => toast.info('Acesse o menu do seu navegador e escolha "Instalar Aplicativo"')}
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover/btn:scale-110 transition-transform shadow-inner">
                    <Smartphone className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Disponível para</span>
                    <span className="text-xs font-black">Android</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-16 rounded-2xl border-border/10 hover:border-primary/40 hover:bg-primary/5 transition-all gap-4 group/btn"
                  onClick={() => toast.info('No Safari, toque em Compartilhar e depois em "Tela de Início"')}
                >
                  <div className="h-10 w-10 rounded-xl bg-slate-500/10 flex items-center justify-center group-hover/btn:scale-110 transition-transform shadow-inner">
                    <Apple className="h-5 w-5 text-slate-500" />
                  </div>
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Disponível para</span>
                    <span className="text-xs font-black">iPhone</span>
                  </div>
                </Button>
              </div>
            </div>
          )}

          <p className="mt-12 text-center text-[11px] text-muted-foreground leading-relaxed px-10 font-medium opacity-60">
            Ambiente Seguro & Monitorado. <br />
            Ao acessar você concorda com nossos termos de uso enterprise.
          </p>
        </div>
      </div>
    </div>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
