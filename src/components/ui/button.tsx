import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-bold cursor-pointer transition-all duration-300 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_10px_20px_-5px_rgba(255,140,0,0.3)] hover:shadow-[0_20px_40px_-10px_rgba(255,140,0,0.4)] hover:bg-primary/90 hover:-translate-y-1 active:translate-y-0",
        destructive: "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/10 hover:bg-destructive/90 hover:shadow-destructive/25 hover:-translate-y-1 active:translate-y-0",
        outline:
          "border-2 border-input bg-background/50 backdrop-blur-sm shadow-sm hover:bg-accent hover:border-primary/40 hover:text-accent-foreground hover:-translate-y-1 active:translate-y-0",
        secondary: "bg-secondary text-secondary-foreground shadow-md hover:bg-secondary/80 hover:-translate-y-1 active:translate-y-0",
        ghost: "hover:bg-accent/80 hover:text-accent-foreground rounded-xl transition-all hover:scale-105 active:scale-95",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "bg-brand-gradient text-white shadow-[0_15px_30px_-5px_rgba(255,140,0,0.4)] hover:shadow-[0_25px_50px_-10px_rgba(255,140,0,0.6)] hover:scale-[1.05] border-none active:scale-95 hover:-translate-y-1.5",
        glass: "bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 transition-all hover:-translate-y-1 active:translate-y-0",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-14 rounded-2xl px-10 text-base font-black",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
