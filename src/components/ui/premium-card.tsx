import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { motion, HTMLMotionProps } from "framer-motion";

interface PremiumCardProps extends React.HTMLAttributes<HTMLDivElement> {
  blur?: boolean;
  hoverEffect?: boolean;
  asMotion?: boolean;
  motionProps?: HTMLMotionProps<"div">;
}

export const PremiumCard = React.forwardRef<HTMLDivElement, PremiumCardProps>(({ 
  className, 
  blur = true, 
  hoverEffect = true, 
  asMotion = false,
  motionProps,
  children, 
  ...props 
}, ref) => {
  const baseClasses = cn(
    "rounded-[32px] border-border/10 overflow-hidden relative isolation-auto",
    blur && "bg-card/40 backdrop-blur-[32px] shadow-2xl shadow-black/5 ring-1 ring-inset ring-white/5",
    hoverEffect && "hover:border-primary/30 transition-all duration-700 hover:-translate-y-2 hover:shadow-primary/10",
    className
  );

  if (asMotion) {
    return (
      <motion.div {...motionProps} className={cn("h-full", className)}>
        <Card ref={ref} className={cn(baseClasses, "h-full")} {...props}>
          {children}
        </Card>
      </motion.div>
    );
  }

  return (
    <Card ref={ref} className={cn(baseClasses, "premium-shadow")} {...props}>
      {children}
    </Card>
  );
});

PremiumCard.displayName = "PremiumCard";
