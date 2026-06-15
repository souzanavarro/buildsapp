import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  SmartphoneIcon as Smartphone, 
  DownloadIcon as Download, 
  PackageIcon as Package, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Server,
  Github,
  Plus,
  Trash2,
  Play,
  RotateCcw,
  Terminal,
  ExternalLink,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { handleApiError, invokeFunction } from "@/utils/error-handler";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function BuildsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isBuilding, setIsBuilding] = React.useState(false);
  const [isRepoDialogOpen, setIsRepoDialogOpen] = React.useState(false);
  const [newRepo, setNewRepo] = React.useState({
    name: "",
    owner: "",
    repo_path: "",
    branch: "main",
  });

  const { data: builds, isLoading: isLoadingBuilds, refetch: refetchBuilds } = useQuery({
    queryKey: ["app-builds-new"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_builds")
        .select(`
          *,
          github_repositories(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  const { data: repositories, isLoading: isLoadingRepos } = useQuery({
    queryKey: ["github-repositories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("github_repositories")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const createRepoMutation = useMutation({
    mutationFn: async (repo: typeof newRepo) => {
      const { data, error } = await supabase
        .from("github_repositories")
        .insert([repo])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["github-repositories"] });
      setIsRepoDialogOpen(false);
      setNewRepo({ name: "", owner: "", repo_path: "", branch: "main" });
      toast.success(t("Repositório adicionado", "Repositório adicionado"));
    },
    onError: (error: any) => {
      toast.error(t("Erro ao adicionar repositório", "Erro ao adicionar repositório") + ": " + error.message);
    },
  });

  const deleteRepoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("github_repositories")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["github-repositories"] });
      toast.success(t("Repositório removido", "Repositório removido"));
    },
  });

  const deleteBuildMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("app_builds")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-builds-new"] });
      toast.success(t("Build removido", "Build removido"));
    },
    onError: (error: any) => {
      toast.error(t("Erro ao remover build", "Erro ao remover build") + ": " + error.message);
    },
  });

  const handleStartBuild = async (repositoryId?: string) => {
    setIsBuilding(true);
    try {
      const { data, error } = await invokeFunction(supabase, "trigger-github-build", {
        body: { repository_id: repositoryId }
      });
      
      if (error) return;
      
      toast.success(t("Build iniciado", "Build iniciado"), {
        description: t("O processo de construção foi iniciado no GitHub Actions.", "O processo de construção foi iniciado no GitHub Actions.")
      });
      refetchBuilds();
    } catch (err: any) {
      handleApiError(err, {
        title: t("Falha na Comunicação", "Falha na Comunicação"),
        description: t("Não foi possível acionar o build. Verifique as configurações.", "Não foi possível acionar o build. Verifique as configurações.")
      });
    } finally {
      setIsBuilding(false);
    }
  };

  const handleDownload = async (build: any, type: 'apk' | 'aab' = 'apk') => {
    const url = type === 'apk' ? build.apk_url : build.aab_url;
    const storagePath = type === 'apk' ? build.storage_path : build.aab_storage_path;

    if (url && url.startsWith('http')) {
      window.open(url, '_blank');
      return;
    }

    if (storagePath) {
      try {
        const { data, error } = await invokeFunction(supabase, "get-internal-apk-link", {
          body: { path: storagePath, type }
        });
        
        if (error) return;

        if (data?.url) {
          window.open(data.url, '_blank');
        } else {
          toast.error(t("URL de download não gerada", "URL de download não gerada"));
        }
      } catch (err: any) {
        handleApiError(err, {
          title: t("Erro no Download", "Erro no Download"),
          description: t("Não conseguimos gerar o link de download no momento.", "Não conseguimos gerar o link de download no momento.")
        });
      }
    } else {
      toast.error(t("Nenhum link de download disponível", "Nenhum link de download disponível"));
    }
  };

  const [selectedBuild, setSelectedBuild] = React.useState<string | null>(null);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic text-foreground">
            {t("Gestão de Builds", "Gestão de Builds")}
          </h1>
          <p className="text-sm font-medium text-muted-foreground opacity-70">
            {t("Configuração de repositórios e compilação remota via GitHub", "Configuração de repositórios e compilação remota via GitHub")}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isRepoDialogOpen} onOpenChange={setIsRepoDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-2xl font-black uppercase tracking-widest text-xs h-12 px-6 border-primary/20 bg-primary/5 text-primary">
                <Plus className="mr-2 h-4 w-4" />
                {t("Novo Repositório", "Novo Repositório")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
              <DialogHeader>
                <DialogTitle>{t("Adicionar Repositório GitHub", "Adicionar Repositório GitHub")}</DialogTitle>
                <DialogDescription>
                  {t("Configure um novo repositório para realizar builds automáticos.", "Configure um novo repositório para realizar builds automáticos.")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">{t("Nome do Projeto", "Nome do Projeto")}</Label>
                  <Input 
                    id="name" 
                    placeholder="Ex: BuildsApp" 
                    value={newRepo.name}
                    onChange={(e) => setNewRepo({...newRepo, name: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="owner">{t("Proprietário/Org", "Proprietário/Org")}</Label>
                  <Input 
                    id="owner" 
                    placeholder="Ex: souzanavarro" 
                    value={newRepo.owner}
                    onChange={(e) => setNewRepo({...newRepo, owner: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="repo">{t("Repositório", "Repositório")}</Label>
                  <Input 
                    id="repo" 
                    placeholder="Ex: buildsapp" 
                    value={newRepo.repo_path}
                    onChange={(e) => setNewRepo({...newRepo, repo_path: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="branch">{t("Branch", "Branch")}</Label>
                  <Input 
                    id="branch" 
                    placeholder="main" 
                    value={newRepo.branch}
                    onChange={(e) => setNewRepo({...newRepo, branch: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={() => createRepoMutation.mutate(newRepo)}
                  disabled={createRepoMutation.isPending || !newRepo.name || !newRepo.owner || !newRepo.repo_path}
                  className="rounded-xl"
                >
                  {createRepoMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("Salvar", "Salvar")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button 
            onClick={() => handleStartBuild()}
            disabled={isBuilding}
            className="rounded-2xl font-black uppercase tracking-widest text-xs h-12 px-8 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            {isBuilding ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Github className="mr-2 h-4 w-4" />
            )}
            {t("Build Projeto Atual", "Build Projeto Atual")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Repositórios Configurados */}
        <Card className="lg:col-span-1 rounded-[2rem] border-border/10 bg-card/40 backdrop-blur-xl overflow-hidden group hover:border-primary/30 transition-all duration-500">
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <Github className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-black tracking-tight italic">{t("Repositórios", "Repositórios")}</CardTitle>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">{t("Fontes de compilação", "Fontes de compilação")}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {isLoadingRepos ? (
               <div className="space-y-2">
                 {[1, 2].map(i => <div key={i} className="h-16 w-full rounded-xl bg-muted/20 animate-pulse" />)}
               </div>
            ) : repositories && repositories.length > 0 ? (
              <div className="space-y-3">
                {repositories.map((repo: any) => (
                  <div key={repo.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group/repo">
                    <div className="flex flex-col">
                      <span className="text-sm font-black italic">{repo.name}</span>
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{repo.owner}/{repo.repo_path} ({repo.branch})</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover/repo:opacity-100 transition-opacity">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-primary hover:bg-primary/10"
                        onClick={() => handleStartBuild(repo.id)}
                        title={t("Iniciar Build", "Iniciar Build")}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => deleteRepoMutation.mutate(repo.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-center text-muted-foreground py-10 uppercase font-bold tracking-widest opacity-40">
                {t("Nenhum repositório externo", "Nenhum repositório externo")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Histórico de Builds */}
        <Card className="lg:col-span-2 rounded-[2rem] border-border/10 bg-card/40 backdrop-blur-xl overflow-hidden group hover:border-primary/30 transition-all duration-500">
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-black tracking-tight italic">{t("Histórico", "Histórico")}</CardTitle>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">{t("Últimas execuções no GitHub", "Últimas execuções no GitHub")}</p>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <ScrollArea className="h-[550px] pr-4">
              {isLoadingBuilds ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-24 w-full rounded-2xl bg-muted/20 animate-pulse" />)}
                </div>
              ) : builds && builds.length > 0 ? (
                <div className="space-y-4">
                  {builds.map((build: any) => (
                    <div 
                      key={build.id} 
                      className={cn(
                        "rounded-2xl bg-white/5 border transition-all overflow-hidden",
                        build.status === 'error' ? "border-destructive/20" : "border-white/5",
                        selectedBuild === build.id ? "ring-2 ring-primary/30" : "hover:border-primary/20"
                      )}
                    >
                      <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center",
                            build.status === 'success' ? "bg-emerald-500/10 text-emerald-500" : 
                            build.status === 'pending' ? "bg-amber-500/10 text-amber-500" : "bg-destructive/10 text-destructive"
                          )}>
                            {build.status === 'pending' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Github className="h-5 w-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm tracking-tight italic">
                                {build.github_repositories?.name || "Projeto Principal"}
                              </span>
                              <Badge variant={build.status === 'success' ? 'default' : (build.status === 'pending' ? 'outline' : 'destructive')} className="text-[8px] font-black uppercase px-2 py-0">
                                {build.status === 'success' ? t("Sucesso", "Sucesso") : 
                                 build.status === 'pending' ? t("Processando", "Processando") : t("Erro", "Erro")}
                              </Badge>
                            </div>
                            <div className="flex flex-col mt-1">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                 v{build.version} • {format(new Date(build.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {build.status === 'success' && (
                            <div className="flex gap-2">
                              {(build.apk_url || build.storage_path) && (
                                <Button 
                                  size="sm"
                                  variant="outline"
                                  className="rounded-xl font-black uppercase text-[10px] tracking-widest border-primary/20 bg-primary/5 text-primary hover:bg-primary hover:text-white h-10 px-4"
                                  onClick={() => handleDownload(build, 'apk')}
                                >
                                  <Download className="mr-2 h-3 w-3" /> APK
                                </Button>
                              )}
                              {(build.aab_url || build.aab_storage_path) && (
                                <Button 
                                  size="sm"
                                  variant="outline"
                                  className="rounded-xl font-black uppercase text-[10px] tracking-widest border-secondary/20 bg-secondary/5 text-secondary hover:bg-secondary hover:text-white h-10 px-4"
                                  onClick={() => handleDownload(build, 'aab')}
                                >
                                  <Download className="mr-2 h-3 w-3" /> AAB
                                </Button>
                              )}
                            </div>
                          )}
                          
                          {build.status === 'error' && (
                            <Button 
                              size="sm"
                              variant="outline"
                              className="rounded-xl font-black uppercase text-[10px] tracking-widest border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive hover:text-white h-10 px-4"
                              onClick={() => handleStartBuild(build.repository_id)}
                              disabled={isBuilding}
                            >
                              <RotateCcw className={cn("mr-2 h-3 w-3", isBuilding && "animate-spin")} /> {t("Reexecutar", "Reexecutar")}
                            </Button>
                          )}

                          <Button 
                            size="sm"
                            variant="ghost"
                            className="rounded-xl font-black uppercase text-[10px] tracking-widest h-10 px-4"
                            onClick={() => setSelectedBuild(selectedBuild === build.id ? null : build.id)}
                          >
                            <Terminal className="mr-2 h-3 w-3" /> {selectedBuild === build.id ? t("Fechar", "Fechar") : t("Logs", "Logs")}
                            {selectedBuild === build.id ? <ChevronDown className="ml-2 h-3 w-3" /> : <ChevronRight className="ml-2 h-3 w-3" />}
                          </Button>

                          <Button 
                            size="sm"
                            variant="ghost"
                            className="rounded-xl h-10 w-10 p-0 text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (window.confirm(t("Tem certeza que deseja excluir este registro de build?", "Tem certeza que deseja excluir este registro de build?"))) {
                                deleteBuildMutation.mutate(build.id);
                              }
                            }}
                            title={t("Excluir", "Excluir")}
                            disabled={deleteBuildMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>

                          {build.github_run_id && (
                            <Button 
                              size="sm"
                              variant="ghost"
                              className="rounded-xl h-10 w-10 p-0"
                              onClick={() => window.open(`https://github.com/souzanavarro/buildsapp/actions/runs/${build.github_run_id}`, '_blank')}
                              title={t("Ver no GitHub", "Ver no GitHub")}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Log Area */}
                      <AnimatePresence>
                        {selectedBuild === build.id && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-white/5 bg-black/40 p-5 space-y-4 overflow-hidden"
                          >
                            {build.error_message && (
                              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold font-mono">
                                {t("ERRO:", "ERRO:")} {build.error_message}
                              </div>
                            )}
                            
                            <div className="space-y-2">
                              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50 flex items-center gap-2">
                                <Terminal className="h-3 w-3" /> {t("Linha do Tempo da Execução", "Linha do Tempo da Execução")}
                              </p>
                              
                              <div className="bg-black/60 rounded-xl p-4 font-mono text-[11px] leading-relaxed space-y-2 overflow-x-auto">
                                {Array.isArray(build.logs) && build.logs.length > 0 ? (
                                  build.logs.map((log: any, idx: number) => (
                                    <div key={idx} className="flex gap-4 group/log">
                                      <span className="text-muted-foreground/40 shrink-0">[{format(new Date(log.timestamp), "HH:mm:ss")}]</span>
                                      <span className={cn(
                                        "font-bold",
                                        log.event === 'error' ? "text-destructive" : "text-primary/80"
                                      )}>
                                        {log.event?.toUpperCase()}:
                                      </span>
                                      <span className="text-white/70">{log.details || log.message}</span>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-muted-foreground/40 italic py-4 flex items-center justify-center gap-2">
                                    <Loader2 className="h-3 w-3 animate-spin" /> {t("Aguardando logs do GitHub Actions...", "Aguardando logs do GitHub Actions...")}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex justify-end">
                              <Button 
                                variant="link" 
                                size="sm" 
                                className="text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary"
                                onClick={() => refetchBuilds()}
                              >
                                <RotateCcw className="mr-2 h-3 w-3" /> {t("Atualizar Status", "Atualizar Status")}
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                  <Package className="h-12 w-12 text-muted-foreground opacity-20" />
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest opacity-40">
                    {t("Nenhuma execução encontrada", "Nenhuma execução encontrada")}
                  </p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}