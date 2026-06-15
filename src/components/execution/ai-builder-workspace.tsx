import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, Send, Smartphone, Globe, Code2, 
  Rocket, ChevronLeft, Layout, Palette, Database, 
  Settings, Download, Github, Monitor, Tablet,
  Plus, Undo, Redo, Play, Layers, Box,
  MessageSquare, History, Zap, Trash2, Copy,
  ArrowUpRight, Share2, Check, Loader2, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate, useParams } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function AIBuilderWorkspace() {
  const { id } = useParams({ from: "/ai-builder/$id" });
  const navigate = useNavigate();
  const auth = useAuth();
  const [project, setProject] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeView, setActiveView] = useState<"preview" | "code" | "db">("preview");
  const [deviceSize, setDeviceSize] = useState<"mobile" | "tablet" | "desktop">("mobile");
  const [activeTab, setActiveTab] = useState("settings");
  const [config, setConfig] = useState<any>({
    version: "1.0.0",
    icon_url: "",
    modules: {
      dashboard: true,
      routes: true,
      map: true,
      upload: true,
      subscription: true
    }
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchProject = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("ai_projects")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setProject(data);
      if (data.app_config) {
        setConfig(data.app_config);
      }

      const { data: prompts, error: promptsErr } = await supabase
        .from("ai_prompts")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: true });

      if (promptsErr) throw promptsErr;
      setMessages(prompts || []);
    } catch (err: any) {
      toast.error("Erro ao carregar projeto: " + err.message);
      navigate({ to: "/ai-builder" });
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isGenerating) return;
    if (!auth.user) {
      toast.error("Sua sessão expirou. Faça login novamente.");
      return;
    }

    const userMessage = input.trim();
    setInput("");
    setIsGenerating(true);

    try {
      // 1. Store User Message
      const { data: userMsg, error: userErr } = await supabase
        .from("ai_prompts")
        .insert({
          project_id: id!,
          user_id: auth.user.id,
          content: userMessage,
          role: "user"
        })
        .select()
        .single();

      if (userErr) throw userErr;
      setMessages(prev => [...prev, userMsg]);

      // 2. Simulate AI Processing
      // In a real scenario, this would call an Edge Function with OpenAI/Anthropic
      await new Promise(r => setTimeout(r, 2000));

      const aiResponse = "Excelente escolha! Vou estruturar o aplicativo com as telas de Dashboard, Configurações e Perfil. Estou configurando o banco de dados PostgreSQL no Supabase agora mesmo...";

      const { data: aiMsg, error: aiErr } = await supabase
        .from("ai_prompts")
        .insert({
          project_id: id!,
          user_id: auth.user.id,
          content: aiResponse,
          role: "assistant"
        })
        .select()
        .single();

      if (aiErr) throw aiErr;
      setMessages(prev => [...prev, aiMsg]);
      
      // Update project config (mock)
      await supabase
        .from("ai_projects")
        .update({ status: 'ready' })
        .eq("id", id);

    } catch (err: any) {
      toast.error("Erro ao processar prompt: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateConfig = async (newConfig: any) => {
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from("ai_projects")
        .update({ app_config: newConfig })
        .eq("id", id);

      if (error) throw error;
      setConfig(newConfig);
      toast.success("Configurações salvas com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateName = async (newName: string) => {
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from("ai_projects")
        .update({ name: newName })
        .eq("id", id);

      if (error) throw error;
      setProject({ ...project, name: newName });
      toast.success("Nome atualizado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao atualizar nome: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };


  if (!project) return null;

  return (
    <div className="fixed inset-0 top-20 bg-background flex flex-col md:flex-row overflow-hidden">
      {/* Left Sidebar: Prompt Workspace */}
      <aside className="w-full md:w-[400px] max-h-[45dvh] md:max-h-none border-b md:border-b-0 md:border-r border-border/40 bg-card/30 backdrop-blur-xl flex flex-col">
        <div className="p-6 border-b border-border/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Sparkles className="h-4 w-4" />
             </div>
             <h2 className="font-black tracking-tight">AI Workspace</h2>
          </div>
          <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8">
             <History className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>

        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          <div className="space-y-6">
            {messages.length === 0 && (
              <div className="space-y-4 py-8">
                <div className="bg-primary/5 rounded-[2rem] p-6 border border-primary/10">
                   <p className="text-sm font-medium leading-relaxed">
                     Olá! Eu sou o assistente de configuração do Rota Certa. Posso te ajudar a personalizar o seu PWA, ajustar cores do mapa, configurar notificações ou modificar regras de cálculo de frete.
                   </p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                   <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 ml-1">Sugestões</p>
                   {[
                     "Mudar cor principal para Azul",
                     "Adicionar notificação de nova rota",
                     "Ajustar cálculo de lucro por entrega",
                     "Personalizar ícone do marcador no mapa"
                   ].map((s, i) => (
                     <button 
                       key={i} 
                       onClick={() => setInput(s)}
                       className="text-left p-3 rounded-xl bg-muted/30 hover:bg-muted/50 text-xs font-bold transition-colors border border-transparent hover:border-border/40"
                     >
                       {s}
                     </button>
                   ))}
                </div>
              </div>
            )}

            {messages.map((m, idx) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex flex-col gap-2 max-w-[85%]",
                  m.role === "user" ? "ml-auto items-end" : "items-start"
                )}
              >
                <div className={cn(
                  "p-4 rounded-[1.5rem]",
                  m.role === "user" 
                    ? "bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/10" 
                    : "bg-muted/50 border border-border/40 text-foreground font-medium"
                )}>
                  <p className="text-sm leading-relaxed">{m.content}</p>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                   {m.role === "user" ? "Você" : "Builder AI"} • {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </motion.div>
            ))}

            {isGenerating && (
              <div className="flex items-center gap-3 text-primary animate-pulse ml-1">
                 <Loader2 className="h-4 w-4 animate-spin" />
                 <span className="text-xs font-black uppercase tracking-widest">IA gerando código...</span>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-6 border-t border-border/20 bg-card/50">
           <div className="relative">
              <textarea 
                placeholder="Descreva seu aplicativo ou peça alterações..."
                className="w-full bg-muted/50 border-border/40 rounded-[1.5rem] p-4 pr-12 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all resize-none min-h-[100px]"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button 
                size="icon" 
                className="absolute right-3 bottom-3 rounded-xl h-10 w-10 shadow-lg"
                disabled={!input.trim() || isGenerating}
                onClick={handleSendMessage}
              >
                <Send className="h-4 w-4" />
              </Button>
           </div>
           <p className="text-[10px] text-center mt-3 text-muted-foreground font-bold uppercase tracking-widest">
              Precisa de ajuda? Tente "Criar tela de login"
           </p>
        </div>
      </aside>

      {/* Main Builder Area */}
      <main className="flex-1 min-h-0 flex flex-col bg-muted/20">
        {/* Top Header */}
        <header className="min-h-16 border-b border-border/20 bg-background/50 backdrop-blur-xl px-3 sm:px-6 py-3 md:py-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto min-w-0">
             <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate({ to: "/ai-builder" })}>
                <ChevronLeft className="h-5 w-5" />
             </Button>
             <div className="h-6 w-[1px] bg-border/20" />
             <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <h1 className="font-black tracking-tight truncate">{project.name}</h1>
                <Badge variant="outline" className="rounded-lg bg-green-500/5 text-green-500 border-none px-2 py-0.5 text-[9px] sm:text-[10px] font-black shrink-0">
                   PROJETO ATIVO
                </Badge>
             </div>
          </div>

          <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-2">
             <div className="flex items-center bg-muted/50 p-1 rounded-xl">
                {[
                  { id: 'mobile', icon: Smartphone },
                  { id: 'tablet', icon: Tablet },
                  { id: 'desktop', icon: Monitor }
                ].map(d => (
                  <Button 
                    key={d.id}
                    variant={deviceSize === d.id ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => setDeviceSize(d.id as any)}
                  >
                    <d.icon className="h-4 w-4" />
                  </Button>
                ))}
             </div>
             
             <Button variant="outline" size="sm" className="rounded-xl font-bold h-9 px-3 sm:px-4">
                <Share2 className="sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Compartilhar</span>
             </Button>
             <Button size="sm" className="rounded-xl font-black h-9 px-3 sm:px-6 shadow-lg shadow-primary/20">
                <Rocket className="sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Deploy</span>
             </Button>
          </div>
        </header>

        {/* Builder Content Tabs */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-auto md:overflow-hidden">
           {/* Left Toolbar (Visual Tools) */}
           <div className="w-full md:w-16 border-b md:border-b-0 md:border-r border-border/20 bg-background flex flex-row md:flex-col items-center py-3 md:py-6 px-3 md:px-0 gap-3 md:gap-6 overflow-x-auto">
              {[
                { id: 'screens', icon: Layout, label: 'Telas' },
                { id: 'layers', icon: Layers, label: 'Camadas' },
                { id: 'components', icon: Box, label: 'Componentes' },
                { id: 'database', icon: Database, label: 'Dados' },
                { id: 'theme', icon: Palette, label: 'Design' },
                { id: 'settings', icon: Settings, label: 'Config' }
              ].map(item => (
                <button 
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "p-3 rounded-2xl transition-all relative group",
                    activeTab === item.id ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="hidden md:block absolute left-full ml-4 px-2 py-1 bg-popover rounded text-[10px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                     {item.label}
                  </span>
                </button>
              ))}
           </div>

           {/* Panels Area */}
           <div className="w-full md:w-72 max-h-[35dvh] md:max-h-none border-b md:border-b-0 md:border-r border-border/20 bg-card/20 backdrop-blur-sm p-4 overflow-y-auto">
              <AnimatePresence mode="wait">
                 {activeTab === 'screens' && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                       <div className="flex items-center justify-between">
                          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Telas do App</h3>
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg"><Plus className="h-3 w-3" /></Button>
                       </div>
                       <div className="space-y-2">
                          {["Dashboard", "Lista de Pedidos", "Detalhes do Produto", "Perfil do Usuário", "Carrinho"].map((s, i) => (
                             <div key={i} className={cn(
                                "flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border border-transparent",
                                i === 0 ? "bg-primary/10 border-primary/20 text-primary" : "hover:bg-muted/30"
                             )}>
                                <Layout className="h-4 w-4" />
                                <span className="text-xs font-bold">{s}</span>
                             </div>
                          ))}
                       </div>
                    </motion.div>
                 )}

                 {activeTab === 'database' && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                       <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Banco de Dados (SQL)</h3>
                       <div className="space-y-4">
                          {["orders", "products", "customers", "reviews"].map((t, i) => (
                             <div key={i} className="p-4 rounded-[1.5rem] bg-muted/30 border border-border/20">
                                <div className="flex items-center gap-2 mb-2">
                                   <Database className="h-4 w-4 text-blue-500" />
                                   <span className="text-xs font-black">{t}</span>
                                </div>
                                <div className="space-y-1 pl-6">
                                   <div className="text-[10px] font-medium text-muted-foreground">id (uuid, primary key)</div>
                                   <div className="text-[10px] font-medium text-muted-foreground">created_at (timestamp)</div>
                                   <div className="text-[10px] font-medium text-muted-foreground">{t === 'orders' ? 'total_amount (numeric)' : 'name (text)'}</div>
                                </div>
                             </div>
                          ))}
                       </div>
                     </motion.div>
                  )}

                  {activeTab === 'settings' && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                       <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Configurações do PWA</h3>
                       
                       <div className="space-y-4">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Nome do Aplicativo</label>
                             <Input 
                                value={project.name} 
                                onChange={(e) => setProject({...project, name: e.target.value})}
                                onBlur={(e) => handleUpdateName(e.target.value)}
                                className="h-10 rounded-xl bg-muted/50 border-none font-bold" 
                             />
                          </div>

                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Versão</label>
                             <Input 
                                value={config.version || "1.0.0"} 
                                onChange={(e) => setConfig({...config, version: e.target.value})}
                                onBlur={() => handleUpdateConfig(config)}
                                className="h-10 rounded-xl bg-muted/50 border-none font-mono" 
                             />
                          </div>

                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">URL do Ícone (512x512)</label>
                             <Input 
                                value={config.icon_url || ""} 
                                onChange={(e) => setConfig({...config, icon_url: e.target.value})}
                                onBlur={() => handleUpdateConfig(config)}
                                placeholder="https://exemplo.com/icon.png"
                                className="h-10 rounded-xl bg-muted/50 border-none text-xs" 
                             />
                          </div>

                          <div className="space-y-3 pt-4 border-t border-border/20">
                             <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Módulos Ativos</h4>
                             <div className="space-y-2">
                                {[
                                  { id: 'dashboard', label: 'Dashboard' },
                                  { id: 'routes', label: 'Roteiros' },
                                  { id: 'map', label: 'Mapa de Entregas' },
                                  { id: 'upload', label: 'Importar Planilha' },
                                  { id: 'subscription', label: 'Assinatura' }
                                ].map((mod) => (
                                  <div key={mod.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/30 transition-colors">
                                    <span className="text-xs font-bold">{mod.label}</span>
                                    <input 
                                      type="checkbox"
                                      checked={config.modules?.[mod.id] !== false}
                                      onChange={(e) => {
                                        const newConfig = {
                                          ...config,
                                          modules: {
                                            ...config.modules,
                                            [mod.id]: e.target.checked
                                          }
                                        };
                                        handleUpdateConfig(newConfig);
                                      }}
                                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                  </div>
                                ))}
                             </div>
                          </div>
                       </div>

                       {isSaving && (
                          <div className="flex items-center gap-2 text-primary animate-pulse">
                             <Loader2 className="h-3 w-3 animate-spin" />
                             <span className="text-[10px] font-black uppercase tracking-widest">Salvando...</span>
                          </div>
                       )}
                    </motion.div>
                 )}

              </AnimatePresence>
           </div>

           {/* Central Preview Area */}
           <div className="flex-1 min-h-0 relative flex items-center justify-center p-4 md:p-12 overflow-hidden">
              {/* Toolbar Buttons Floating */}
              <div className="absolute top-3 md:top-6 left-1/2 -translate-x-1/2 flex items-center justify-center gap-1.5 md:gap-2 w-[calc(100%-1.5rem)] md:w-auto bg-background/80 backdrop-blur-xl border border-border/40 p-1.5 rounded-2xl shadow-2xl z-10">
                 <Button variant="ghost" size="sm" className={cn("rounded-xl h-9 px-4 font-bold", activeView === 'preview' && "bg-muted shadow-sm")} onClick={() => setActiveView('preview')}>
                    <Smartphone className="mr-2 h-4 w-4" /> Preview
                 </Button>
                 <Button variant="ghost" size="sm" className={cn("rounded-xl h-9 px-4 font-bold", activeView === 'code' && "bg-muted shadow-sm")} onClick={() => setActiveView('code')}>
                    <Code2 className="mr-2 h-4 w-4" /> Código
                 </Button>
                 <Button variant="ghost" size="sm" className={cn("rounded-xl h-9 px-4 font-bold", activeView === 'db' && "bg-muted shadow-sm")} onClick={() => setActiveView('db')}>
                    <Database className="mr-2 h-4 w-4" /> Dados
                 </Button>
              </div>

              {/* Responsive Frame */}
              <motion.div 
                layout
                className={cn(
                  "bg-white rounded-[2rem] md:rounded-[3rem] border-[8px] md:border-[12px] border-zinc-900 shadow-2xl overflow-hidden relative transition-all duration-700 max-w-full max-h-full",
                  deviceSize === 'mobile'
                    ? "w-[min(390px,92vw)] h-[min(844px,70dvh)] md:h-[844px]"
                    : deviceSize === 'tablet'
                      ? "w-[min(834px,96vw)] h-[min(1194px,72dvh)] md:h-[1194px]"
                      : "w-full h-full max-w-5xl rounded-none border-none"
                )}
              >
                {activeView === 'preview' ? (
                  <div className="h-full flex flex-col bg-slate-50 text-slate-900">
                    <div className="h-10 px-6 flex items-center justify-between text-[11px] font-bold">
                       <span>9:41</span>
                       <div className="flex items-center gap-1.5">
                          <Zap className="h-3 w-3 fill-current" />
                          <div className="h-3 w-6 border border-current rounded-sm" />
                       </div>
                    </div>
                    
                    <div className="p-6 space-y-8">
                       <div className="flex items-center justify-between">
                          <div className="space-y-1">
                             <h4 className="text-2xl font-black tracking-tight">Dashboard</h4>
                             <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Bem-vindo ao seu app</p>
                          </div>
                          <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white">
                             <Layout className="h-6 w-6" />
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          {[
                            { label: "Vendas", val: "R$ 12.450", color: "bg-blue-500" },
                            { label: "Clientes", val: "1.284", color: "bg-emerald-500" },
                            { label: "Pedidos", val: "482", color: "bg-purple-500" },
                            { label: "Meta", val: "84%", color: "bg-orange-500" }
                          ].map((stat, i) => (
                            <div key={i} className="p-4 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-2">
                               <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center text-white", stat.color)}>
                                  <Zap className="h-4 w-4" />
                               </div>
                               <div>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                  <p className="text-lg font-black">{stat.val}</p>
                               </div>
                            </div>
                          ))}
                       </div>

                       <div className="space-y-4">
                          <div className="flex items-center justify-between">
                             <h5 className="font-black tracking-tight">Últimas Atividades</h5>
                             <Button variant="link" size="sm" className="text-xs font-bold">Ver tudo</Button>
                          </div>
                          <div className="space-y-3">
                             {[1,2,3].map(i => (
                               <div key={i} className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center gap-4">
                                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                                     <Rocket className="h-5 w-5 text-slate-400" />
                                  </div>
                                  <div className="flex-1">
                                     <p className="text-sm font-bold">Novo pedido realizado</p>
                                     <p className="text-[10px] text-slate-500">Há 5 minutos • Pedido #00234</p>
                                  </div>
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>
                  </div>
                ) : activeView === 'code' ? (
                  <div className="h-full bg-zinc-950 p-8 font-mono text-sm overflow-auto text-zinc-300">
                     <div className="flex items-center gap-2 mb-6 text-zinc-500">
                        <Code2 className="h-4 w-4" />
                        <span>src/screens/Dashboard.tsx</span>
                     </div>
                     <pre className="space-y-1">
                        <code className="block"><span className="text-purple-400">import</span> React <span className="text-purple-400">from</span> <span className="text-green-400">'react'</span>;</code>
                        <code className="block"><span className="text-purple-400">import</span> {"{ View, Text, StyleSheet }"} <span className="text-purple-400">from</span> <span className="text-green-400">'react-native'</span>;</code>
                        <code className="block"><span className="text-zinc-500">// AI Generated Component</span></code>
                        <code className="block"><span className="text-blue-400">export const</span> <span className="text-yellow-400">DashboardScreen</span> = () ={">"} {"{"}</code>
                        <code className="block">  <span className="text-purple-400">return</span> (</code>
                        <code className="block">    {"<View style={styles.container}>"}</code>
                        <code className="block">      {"<Text style={styles.title}>Dashboard</Text>"}</code>
                        <code className="block">      <span className="text-zinc-500">{"{/* ... components ... */}"}</span></code>
                        <code className="block">    {"</View>"}</code>
                        <code className="block">  );</code>
                        <code className="block">{"};"}</code>
                     </pre>
                  </div>
                ) : (
                  <div className="h-full bg-slate-50 p-8 overflow-auto">
                     <div className="flex items-center justify-between mb-8">
                        <h4 className="text-xl font-black tracking-tight">PostgreSQL Tables</h4>
                        <Button variant="outline" size="sm" className="rounded-xl font-bold"><Plus className="mr-2 h-4 w-4" /> New Table</Button>
                     </div>
                     <table className="w-full border-collapse">
                        <thead>
                           <tr className="border-b border-slate-200">
                              <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Column</th>
                              <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Type</th>
                              <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Rules</th>
                           </tr>
                        </thead>
                        <tbody>
                           {[
                              { name: 'id', type: 'uuid', rule: 'primary key' },
                              { name: 'name', type: 'text', rule: 'not null' },
                              { name: 'price', type: 'numeric', rule: 'default 0' },
                              { name: 'category_id', type: 'uuid', rule: 'references categories' }
                           ].map((col, i) => (
                              <tr key={i} className="border-b border-slate-100">
                                 <td className="py-4 text-sm font-bold">{col.name}</td>
                                 <td className="py-4 text-xs font-mono bg-slate-100 rounded px-2 inline-block my-2">{col.type}</td>
                                 <td className="py-4 text-xs text-slate-500">{col.rule}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
                )}

                {/* Android Bottom Bar Mock */}
                {deviceSize === 'mobile' && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-zinc-900/10 rounded-full" />
                )}
              </motion.div>

              {/* Action Buttons Floating Right */}
              <div className="absolute right-12 bottom-12 flex flex-col gap-3">
                 <Button size="icon" className="h-14 w-14 rounded-2xl bg-white text-primary border border-border shadow-2xl hover:scale-110 transition-transform">
                    <Undo className="h-6 w-6" />
                 </Button>
                 <Button size="icon" className="h-14 w-14 rounded-2xl bg-white text-primary border border-border shadow-2xl hover:scale-110 transition-transform">
                    <Redo className="h-6 w-6" />
                 </Button>
                 <Button size="icon" className="h-16 w-16 rounded-[2rem] bg-brand-gradient text-white shadow-2xl shadow-primary/30 hover:scale-110 transition-transform">
                    <Play className="h-8 w-8" />
                 </Button>
              </div>
           </div>

           {/* Right Inspector Panel */}
           <div className="w-80 border-l border-border/20 bg-background/50 backdrop-blur-md p-6 space-y-8 overflow-y-auto">
              <div className="space-y-4">
                 <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Propriedades</h3>
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Título da Tela</label>
                       <Input defaultValue="Dashboard" className="h-10 rounded-xl bg-muted/50 border-none" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Cor de Fundo</label>
                       <div className="flex gap-2">
                          <div className="h-8 w-8 rounded-lg bg-slate-50 border border-border/60" />
                          <Input defaultValue="#F8FAFC" className="h-8 rounded-lg bg-muted/50 border-none text-xs" />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="space-y-4">
                 <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Exportação</h3>
                 <div className="grid grid-cols-1 gap-2">
                    <Button variant="outline" className="w-full justify-start rounded-xl h-12 border-border/60 hover:border-primary/50">
                       <Smartphone className="mr-3 h-4 w-4 text-primary" /> Exportar APK (Android)
                    </Button>
                    <Button variant="outline" className="w-full justify-start rounded-xl h-12 border-border/60 hover:border-primary/50">
                       <Download className="mr-3 h-4 w-4 text-blue-500" /> Exportar AAB (Play Store)
                    </Button>
                    <Button variant="outline" className="w-full justify-start rounded-xl h-12 border-border/60 hover:border-primary/50">
                       <Smartphone className="mr-3 h-4 w-4 text-purple-500" /> Exportar iOS (IPA)
                    </Button>
                    <Button variant="outline" className="w-full justify-start rounded-xl h-12 border-border/60 hover:border-primary/50">
                       <Github className="mr-3 h-4 w-4" /> Sync com GitHub
                    </Button>
                 </div>
              </div>

              <div className="p-4 rounded-3xl bg-primary/5 border border-primary/20 space-y-3">
                 <div className="flex items-center gap-2">
                    <Rocket className="h-4 w-4 text-primary" />
                    <span className="text-xs font-black tracking-tight">Build Status</span>
                 </div>
                 <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold">
                       <span>Processamento</span>
                       <span>85%</span>
                    </div>
                    <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                       <div className="h-full bg-primary w-[85%] rounded-full animate-pulse" />
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}
