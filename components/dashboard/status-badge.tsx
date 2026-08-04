import { cn } from "@/lib/utils"

type Tone = "success" | "destructive" | "warning" | "primary" | "muted"

const toneStyles: Record<Tone, string> = {
  success: "bg-success/12 text-success border-success/20",
  destructive: "bg-destructive/12 text-destructive border-destructive/20",
  warning: "bg-warning/15 text-warning-foreground border-warning/30",
  primary: "bg-primary/10 text-primary border-primary/20",
  muted: "bg-muted text-muted-foreground border-border",
}

export function StatusBadge({
  children,
  tone = "muted",
  className,
}: {
  children: React.ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
