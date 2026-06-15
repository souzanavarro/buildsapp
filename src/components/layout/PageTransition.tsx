import { motion, HTMLMotionProps, Variants, Easing } from "framer-motion";
import { ReactNode, useMemo } from "react";

export type TransitionType = "fade" | "slide-left" | "slide-right" | "slide-up" | "slide-down" | "zoom" | "flip-x" | "flip-y" | "parallax";

interface PageTransitionProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  type?: TransitionType;
  duration?: number;
  easing?: Easing | Easing[];
}

const variants: Record<TransitionType, Variants> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  "slide-left": {
    initial: { x: "100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "-100%", opacity: 0 },
  },
  "slide-right": {
    initial: { x: "-100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "100%", opacity: 0 },
  },
  "slide-up": {
    initial: { y: "100%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: "-100%", opacity: 0 },
  },
  "slide-down": {
    initial: { y: "-100%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: "100%", opacity: 0 },
  },
  zoom: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 1.2, opacity: 0 },
  },
  "flip-x": {
    initial: { rotateX: 90, opacity: 0 },
    animate: { rotateX: 0, opacity: 1 },
    exit: { rotateX: -90, opacity: 0 },
  },
  "flip-y": {
    initial: { rotateY: 90, opacity: 0 },
    animate: { rotateY: 0, opacity: 1 },
    exit: { rotateY: -90, opacity: 0 },
  },
  parallax: {
    initial: { x: "100%", opacity: 0, scale: 0.9, filter: "blur(10px)" },
    animate: { x: 0, opacity: 1, scale: 1, filter: "blur(0px)" },
    exit: { x: "-20%", opacity: 0, scale: 1.1, filter: "blur(10px)" },
  },
};

export const PageTransition = ({
  children,
  type = "fade",
  duration = 0.4,
  easing = [0.16, 1, 0.3, 1] as Easing, // Type cast for safety
  className,
  ...props
}: PageTransitionProps) => {
  const transition = useMemo(() => ({
    duration,
    ease: easing,
  }), [duration, easing]);

  return (
    <motion.div
      variants={variants[type]}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transition}
      className={className}
      style={{
        width: "100%",
        minHeight: "100%",
        ...props.style
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};
