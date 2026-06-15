import React, { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Play, Pause, RotateCcw, FastForward, Navigation2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface TelemetryPoint {
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
}

interface RouteReplayProps {
  points: TelemetryPoint[];
  onPointSelect?: (point: TelemetryPoint) => void;
}

export const RouteReplay = ({ points = [], onPointSelect }: RouteReplayProps) => {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= points.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / speed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, points.length, speed]);

  useEffect(() => {
    if (points[currentIndex] && onPointSelect) {
      onPointSelect(points[currentIndex]);
    }
  }, [currentIndex, points, onPointSelect]);

  const progress = points.length > 0 ? (currentIndex / (points.length - 1)) * 100 : 0;

  if (points.length === 0) return null;

  return (
    <Card className="p-6 rounded-[2.5rem] bg-card border-none shadow-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
            <Navigation2 className="h-5 w-5 text-primary" />
            {t("Replay de Rota", "Replay de Rota")}
          </h3>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-7">
            {t("Analise o percurso e telemetria", "Analise o percurso e telemetria")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-xl h-8 text-[10px] font-bold"
            onClick={() => setSpeed(s => s === 1 ? 2 : s === 2 ? 4 : 1)}
          >
            {speed}x
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button
            variant="default"
            size="icon"
            className="rounded-2xl h-12 w-12 shrink-0 shadow-lg shadow-primary/20"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
          </Button>
          
          <div className="flex-1 space-y-2">
            <Slider 
              value={[currentIndex]} 
              max={points.length - 1} 
              step={1} 
              onValueChange={([val]) => setCurrentIndex(val)}
              className="py-4"
            />
            <div className="flex justify-between text-[10px] font-black uppercase text-muted-foreground">
              <span>{points[currentIndex]?.timestamp ? new Date(points[currentIndex].timestamp).toLocaleTimeString() : '--:--'}</span>
              <span>{points[points.length - 1]?.timestamp ? new Date(points[points.length - 1].timestamp).toLocaleTimeString() : '--:--'}</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-2xl h-12 w-12 shrink-0"
            onClick={() => {
              setCurrentIndex(0);
              setIsPlaying(false);
            }}
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/30 p-4 rounded-2xl flex flex-col items-center">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">{t("Velocidade Atual", "Velocidade Atual")}</span>
            <span className="text-2xl font-black">{Math.round(points[currentIndex]?.speed || 0)} <span className="text-xs">km/h</span></span>
          </div>
          <div className="bg-muted/30 p-4 rounded-2xl flex flex-col items-center">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">{t("Posição", "Posição")}</span>
            <span className="text-[10px] font-black truncate max-w-full">
              {points[currentIndex]?.latitude.toFixed(5)}, {points[currentIndex]?.longitude.toFixed(5)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
