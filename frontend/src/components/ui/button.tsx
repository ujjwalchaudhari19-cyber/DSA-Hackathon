import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer shadow-xs select-none"

    const variants = {
      default:
        "bg-primary text-primary-foreground hover:bg-primary-700 active:bg-primary-800 shadow-xs",
      destructive:
        "bg-destructive text-destructive-foreground hover:opacity-90 shadow-xs",
      outline:
        "border border-border bg-card text-foreground hover:bg-secondary hover:text-foreground",
      secondary:
        "bg-secondary text-secondary-foreground hover:bg-muted active:bg-muted/80",
      ghost: "hover:bg-secondary hover:text-foreground shadow-none",
      link: "text-primary underline-offset-4 hover:underline shadow-none",
    }

    const sizes = {
      default: "h-11 px-5 py-2.5 min-h-[44px]",
      sm: "h-9 rounded-md px-3 text-xs min-h-[36px]",
      lg: "h-12 rounded-md px-8 text-base min-h-[48px]",
      icon: "h-11 w-11 min-h-[44px] min-w-[44px]",
    }

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
