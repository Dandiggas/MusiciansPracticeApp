export const springs = {
  default: { type: "spring" as const, stiffness: 100, damping: 20 },
  snappy: { type: "spring" as const, stiffness: 300, damping: 30 },
  gentle: { type: "spring" as const, stiffness: 50, damping: 15 },
  smooth: { type: "spring" as const, stiffness: 80, damping: 20 },
};

export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springs.default,
  },
};

export const scaleOnTap = {
  whileTap: { scale: 0.98, y: 1 },
  transition: springs.snappy,
};

export const hoverLift = {
  whileHover: { y: -2 },
  transition: springs.default,
};
