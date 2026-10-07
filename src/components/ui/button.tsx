import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50",
  { variants: { variant: {
    default: "bg-primary text-primary-foreground hover:bg-[#D94716] hover:text-white",
    outline: "border border-border bg-white text-foreground hover:bg-muted",
  } }, defaultVariants: { variant: "default" } },
);
type Props = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean };
export function Button({ className, variant, asChild = false, ...props }: Props) {
  const Component = asChild ? Slot : "button";
  return <Component data-slot="button" className={cn(buttonVariants({ variant, className }))} {...props} />;
}
