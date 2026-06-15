import React from 'react';
import { useLocation } from '@/contexts/LocationContext';
import { Button } from '@/components/ui/button';
import { MapPinIcon, MobileIcon, AlertTriangleIcon, SecurityIcon } from '@/components/ui/icons';
import { motion, AnimatePresence } from 'framer-motion';

export const PermissionGuard = () => {
  const { permissions, requestAllPermissions } = useLocation();

  // On PWA, it might be 'prompt' or 'denied'
  const isLocationGranted = permissions.location === 'granted';
  const isCameraGranted = permissions.camera === 'granted';

  if (isLocationGranted && isCameraGranted) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-8 p-6 rounded-[2.5rem] bg-amber-500/10 border border-amber-500/20 backdrop-blur-md"
      >
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="bg-amber-500/20 p-4 rounded-2xl">
            <AlertTriangleIcon className="h-8 w-8 text-amber-500" />
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-1">
            <h3 className="text-lg font-black tracking-tight text-amber-500">Permissões Necessárias</h3>
            <p className="text-sm font-medium text-muted-foreground">
              Para o funcionamento correto das rotas e entregas, precisamos de acesso à sua localização e câmera.
            </p>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${isLocationGranted ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                <MapPinIcon className="h-3.5 w-3.5" />
                Localização: {isLocationGranted ? 'Ativa' : 'Pendente'}
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${isCameraGranted ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                <MobileIcon className="h-3.5 w-3.5" />
                Câmera: {isCameraGranted ? 'Ativa' : 'Pendente'}
              </div>
            </div>
          </div>

          <Button 
            onClick={requestAllPermissions}
            className="rounded-2xl px-8 h-12 font-black shadow-lg shadow-amber-500/20 bg-amber-500 hover:bg-amber-600 text-white"
          >
            <SecurityIcon className="h-5 w-5 mr-2" />
            CONCEDER ACESSO
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
