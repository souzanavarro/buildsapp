import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayCircle, BookOpen, HelpCircle, ArrowRight, Zap, MapPin, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/tutorial")({
  component: () => (
    <AppShell>
      <TutorialPage />
    </AppShell>
  ),
});

function TutorialPage() {
  const tutorials = [
    {
      title: "Introdução ao Rota Certa",
      description: "Conheça as principais funcionalidades e como navegar pelo seu novo painel de controle.",
      icon: Zap,
      duration: "3 min",
      color: "text-amber-500",
      bg: "bg-amber-500/10"
    },
    {
      title: "Importação de Planilhas",
      description: "Aprenda o formato correto e como subir seus dados da Shopee para o sistema.",
      icon: BookOpen,
      duration: "5 min",
      color: "text-primary",
      bg: "bg-primary/10"
    },
    {
      title: "Otimização de Rotas",
      description: "Como usar nossa IA para criar o trajeto mais rápido e econômico para suas entregas.",
      icon: MapPin,
      duration: "4 min",
      color: "text-sky-500",
      bg: "bg-sky-500/10"
    },
    {
      title: "Baixa e Comprovação",
      description: "O guia completo de como tirar fotos e finalizar entregas pelo celular.",
      icon: CheckCircle2,
      duration: "3 min",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10"
    }
  ];

  return (
    <div className="space-y-10 xs:space-y-12 pb-32 lg:pb-16 px-4 md:px-0">
      <div className="space-y-2">
        <h1 className="text-3xl xs:text-5xl font-black tracking-tighter leading-tight text-foreground mb-4">
           Suporte <span className="text-brand-gradient">Técnico</span>
        </h1>
        <p className="text-muted-foreground font-medium text-sm xs:text-base max-w-xl leading-relaxed opacity-80">
           Tudo o que você precisa saber para se tornar um mestre na logística com o Rota Certa.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 xs:gap-8">
        {tutorials.map((t, idx) => (
          <motion.div
            key={t.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="rounded-2xl xs:rounded-[2.5rem] border-border/10 bg-card/30 backdrop-blur-xl overflow-hidden hover:shadow-2xl transition-all group">
              <CardContent className="p-0">
                <div className="relative aspect-video bg-muted flex items-center justify-center cursor-pointer overflow-hidden">
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors z-10" />
                  <div className="relative z-20 h-16 w-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 transition-transform group-hover:scale-110">
                    <PlayCircle className="h-8 w-8 text-white fill-white" />
                  </div>
                </div>
                <div className="p-6 xs:p-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={cn("p-2 rounded-xl", t.bg)}>
                      <t.icon className={cn("h-5 w-5", t.color)} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.duration}</span>
                  </div>
                  <h3 className="text-xl font-black tracking-tight">{t.title}</h3>
                  <p className="text-sm font-medium text-muted-foreground leading-relaxed">{t.description}</p>
                  <Button variant="ghost" className="w-full h-12 rounded-xl font-black text-xs uppercase tracking-widest gap-2">
                    Assistir Agora <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="rounded-2xl xs:rounded-[2.5rem] border-none bg-brand-gradient text-primary-foreground p-8 xs:p-12 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left">
            <h2 className="text-2xl xs:text-3xl font-black tracking-tighter">Ainda tem dúvidas?</h2>
            <p className="text-white/80 font-medium">Nossa equipe de suporte está pronta para te ajudar em tempo real.</p>
          </div>
          <Button variant="glass" size="lg" className="rounded-xl xs:rounded-2xl font-black px-8 xs:px-10 h-14 xs:h-16 text-sm xs:text-base shadow-2xl w-full md:w-auto">
            Falar com Suporte
          </Button>
        </div>
        <HelpCircle className="absolute -right-12 -bottom-12 h-64 w-64 text-white/10" />
      </Card>
    </div>
  );
}

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');
