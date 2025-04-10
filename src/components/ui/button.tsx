import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils/cn"


const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-7 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: // Fluent's Secondary Button
          "bg-neutral-2 text-neutral-11 shadow-sm hover:bg-neutral-4 border border-neutral-5",
        primary: // Fluent's Primary Button
          "bg-primary text-neutral-1 shadow hover:bg-accent-7", // Using accent-7 as hover state
        destructive: // Fluent's Destructive Button
          "bg-error text-neutral-1 shadow-sm hover:bg-red-700", // Assuming --error is red, using darker red for hover
        subtle: // Fluent's Subtle Button
          "bg-transparent text-primary hover:bg-accent-1",
        ghost: // Fluent's Ghost Button (similar to subtle but often used differently)
          "bg-transparent hover:bg-neutral-2 text-foreground hover:text-foreground",
        link: // Standard link style
          "text-primary underline-offset-4 hover:underline",
        outline: // Standard outline
          "border border-neutral-5 bg-background shadow-sm hover:bg-neutral-2 hover:text-neutral-11",
      },
      size: {
        default: "h-9 px-4 py-2", // Fluent default is often 32px or 36px height
        sm: "h-8 rounded-md px-3 text-xs", // Fluent small
        lg: "h-10 rounded-md px-8", // Fluent large
        icon: "h-9 w-9", // For icon buttons
      },
    },
    defaultVariants: {
      variant: "default", // Use Fluent's secondary as default
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
