import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { 
  SparklesIcon as Sparkles, PlusIcon as Plus, SearchIcon as Search, MobileIcon as Smartphone, MarketplaceIcon as Globe, APIIcon as Code2, 
  DeployIcon as Rocket, ClockIcon as Clock, ChevronRightIcon as ChevronRight, ProjectsIcon as Layout, 
  ZapIcon as Zap, SecurityIcon as Shield, DatabaseIcon as Database, EditorIcon as Github, DashboardIcon as MoreVertical
} from "@/components/ui/icons";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function AIBuilderDashboard() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchProjects = useCallback(async () => {
    if (!auth.user) {
      setProjects([]);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("ai_projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (err: any) {
      toast.error("Erro ao carregar projetos: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [auth.user]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createNewProject = async () => {
    if (!auth.user) return;
    try {
      const { data, error } = await supabase
        .from("ai_projects")
        .insert({
          name: "Novo Aplicativo",
          user_id: auth.user.id,
          status: "draft"
        })
        .select()
        .single();

      if (error) throw error;
      navigate({ to: "/ai-builder/$id", params: { id: data.id } });
    } catch (err: any) {
      toast.error("Erro ao criar projeto: " + err.message);
    }
  };

  const filteredProjects = useMemo(
    () => projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [projects, searchQuery],
  );

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl xs:rounded-3xl bg-brand-gradient p-6 xs:p-10 text-white shadow-2xl shadow-primary/20"
      >
        <div className="relative z-10 max-w-2xl space-y-6">
          <Badge className="bg-white/20 hover:bg-white/30 text-white border-none px-4 py-1 backdrop-blur-md uppercase tracking-[0.2em] font-black text-[10px]">
            Tecnologia de Próxima Geração
          </Badge>
          <h1 className="text-3xl xs:text-5xl font-black tracking-tight leading-tight">
            Configure seu <span className="text-white/80">PWA Rota Certa</span> com IA.
          </h1>
          <p className="text-white/70 text-lg font-medium">
            Use nossa inteligência artificial para personalizar cores, ícones, notificações e regras de negócio do seu Rota Certa.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button 
              size="default" 
              onClick={createNewProject}
              className="bg-white text-primary hover:bg-white/90 rounded-xl px-6 font-black h-12 shadow-xl shadow-black/10"
            >
              <Plus className="mr-2 h-5 w-5" />
              Abrir Painel PWA
            </Button>
            <Button 
              size="default" 
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-xl px-6 font-bold h-12 backdrop-blur-md"
            >
              Explorar Templates
            </Button>
          </div>
        </div>

        {/* Abstract Background Elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[600px] h-[600px] bg-white/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 mr-40 mb-40 w-40 h-40 bg-white/20 rounded-full blur-3xl animate-pulse" />
      </motion.div>

      {/* Stats / Features Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 xs:gap-6 px-4 md:px-0">
        {[
          { icon: Smartphone, label: "Instalação Mobile", desc: "Configurações de PWA" },
          { icon: Database, label: "Banco Rota Certa", desc: "Estrutura de Dados" },
          { icon: Globe, label: "Domínio & Hosting", desc: "Sincronização Cloud" },
          { icon: Shield, label: "Controle de Acesso", desc: "Permissões de Role" }
        ].map((item, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * idx }}
            className="p-4 xs:p-5 rounded-xl xs:rounded-2xl bg-card/40 backdrop-blur-md border border-border/40 hover:border-primary/30 transition-all group"
          >
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
              <item.icon className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-foreground tracking-tight">{item.label}</h3>
            <p className="text-xs text-muted-foreground font-medium">{item.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Projects List Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1 px-4 md:px-0">
            <h2 className="text-3xl font-black tracking-tight">Meus Projetos</h2>
            <p className="text-muted-foreground font-medium text-sm">Gerencie seus aplicativos gerados por IA</p>
          </div>
          <div className="relative max-w-sm w-full px-4 md:px-0 mx-auto sm:mx-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar projetos..." 
              className="pl-10 h-12 rounded-2xl bg-muted/50 border-none focus-visible:ring-primary/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1,2,3].map(i => (
              <div key={i} className="h-[320px] rounded-[2.5rem] bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xs:gap-8 px-4 md:px-0 pb-32 lg:pb-0">
            {filteredProjects.map((project, idx) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 * idx }}
                whileHover={{ y: -8 }}
                onClick={() => navigate({ to: "/ai-builder/$id", params: { id: project.id } })}
                className="group cursor-pointer"
              >
                <Card className="h-full rounded-2xl overflow-hidden border-border/40 bg-card/60 backdrop-blur-xl hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500">
                  <div className="h-48 bg-muted relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent group-hover:opacity-100 opacity-50 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center">
                       <Layout className="h-16 w-16 text-primary/20 group-hover:scale-125 transition-transform duration-700" />
                    </div>
                    <div className="absolute top-4 right-4">
                       <Badge className="bg-background/80 text-foreground border-none backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase">
                          {project.status === 'draft' ? 'Rascunho' : project.status}
                       </Badge>
                    </div>
                  </div>
                  <CardContent className="p-5 xs:p-6 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-xl font-black tracking-tight group-hover:text-primary transition-colors">
                          {project.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground font-medium">
                          Criado em {format(new Date(project.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <MoreVertical className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
                    </div>
                    
                    <div className="flex items-center gap-2 pt-2">
                       <Badge variant="secondary" className="bg-primary/5 text-primary border-none rounded-lg flex items-center gap-1.5 px-2 py-1">
                          <Smartphone className="h-3 w-3" />
                          <span className="text-[10px] font-bold">iOS/Android</span>
                       </Badge>
                       <Badge variant="secondary" className="bg-blue-500/5 text-blue-500 border-none rounded-lg flex items-center gap-1.5 px-2 py-1">
                          <Globe className="h-3 w-3" />
                          <span className="text-[10px] font-bold">PWA</span>
                       </Badge>
                    </div>

                    <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                       <div className="flex -space-x-2">
                          {[1,2,3].map(i => (
                            <div key={i} className="h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold">
                               {i === 1 ? 'AI' : i === 2 ? 'UI' : 'DB'}
                            </div>
                          ))}
                       </div>
                       <Button variant="ghost" size="sm" className="rounded-xl font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                          Abrir Workspace <ChevronRight className="ml-2 h-4 w-4" />
                       </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            
            <motion.div
              whileHover={{ scale: 0.98 }}
              onClick={createNewProject}
              className="group cursor-pointer flex items-center justify-center border-2 border-dashed border-border/60 rounded-2xl h-[280px] xs:h-[350px] hover:border-primary/40 hover:bg-primary/5 transition-all"
            >
              <div className="flex flex-col items-center gap-4 text-muted-foreground group-hover:text-primary transition-colors">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Plus className="h-8 w-8" />
                </div>
                <span className="font-black text-lg">Criar Novo Aplicativo</span>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="text-center py-16 bg-card/20 rounded-2xl xs:rounded-3xl border border-border/40 border-dashed mx-4 md:mx-0">
            <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-2xl font-black mb-2">Nenhum app gerado ainda</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-8 font-medium">
              Comece agora mesmo a criar seu primeiro aplicativo usando inteligência artificial.
            </p>
            <Button size="default" onClick={createNewProject} className="rounded-xl h-12 px-8 font-black shadow-xl shadow-primary/20">
              <Zap className="mr-2 h-5 w-5" />
              Começar Agora
            </Button>
          </div>
        )}
      </div>

      {/* Integration Logos */}
      <div className="pt-10 border-t border-border/40">
        <p className="text-center text-[10px] uppercase tracking-[0.3em] font-black text-muted-foreground mb-8">
          Tecnologias Suportadas
        </p>
        <div className="flex flex-wrap justify-center gap-6 xs:gap-12 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-700 px-4">
           <div className="flex items-center gap-2 font-black text-xl"><Code2 className="h-6 w-6" /> React</div>
           <div className="flex items-center gap-2 font-black text-xl"><Smartphone className="h-6 w-6" /> Expo</div>
           <div className="flex items-center gap-2 font-black text-xl"><Database className="h-6 w-6" /> Supabase</div>
           <div className="flex items-center gap-2 font-black text-xl"><Github className="h-6 w-6" /> GitHub</div>
           <div className="flex items-center gap-2 font-black text-xl"><Zap className="h-6 w-6" /> Vercel</div>
        </div>
      </div>
    </div>
  );
}
