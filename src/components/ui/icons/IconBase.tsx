import React from "react";
import { motion, SVGMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

export interface IconProps extends SVGMotionProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
  variant?: "outline" | "filled";
  active?: boolean;
}

export const IconBase = React.forwardRef<SVGSVGElement, IconProps>(
  ({ size = 24, color = "currentColor", variant = "outline", active = false, className, children, ...props }, ref) => {
    return (
      <motion.svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          "transition-colors duration-300",
          active ? "text-primary" : "text-muted-foreground",
          className
        )}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        {...props}
      >
        {children}
      </motion.svg>
    );
  }
);

IconBase.displayName = "IconBase";
