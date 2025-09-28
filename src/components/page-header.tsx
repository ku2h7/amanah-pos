import { cn } from "@/lib/utils"

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  className?: string
}

export function PageHeader({
  title,
  description,
  className,
  children,
  ...props
}: React.PropsWithChildren<PageHeaderProps>) {
  return (
    <div className={cn("flex flex-col gap-2 mb-6", className)} {...props}>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {description && (
        <p className="text-muted-foreground">{description}</p>
      )}
      {children}
    </div>
  )
}
