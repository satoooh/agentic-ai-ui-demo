import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SectionCardProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <Card className="animate-soft-enter border-border/80 bg-card/92 shadow-[0_1px_0_rgb(255_255_255/0.7)_inset,0_12px_32px_rgb(15_23_42/0.06)] transition-all duration-300 hover:border-primary/35 hover:shadow-[0_1px_0_rgb(255_255_255/0.85)_inset,0_16px_34px_rgb(37_99_235/0.12)]">
      <CardHeader className="space-y-2 pb-2">
        <CardTitle className="font-display text-lg leading-snug font-bold">{title}</CardTitle>
        {description ? <CardDescription className="text-sm leading-relaxed">{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}
