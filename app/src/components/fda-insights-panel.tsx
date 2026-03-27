"use client";

import { useFdaInsights } from "@/lib/hooks/use-fda-insights";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface FdaInsightsPanelProps {
  substanceName?: string;
}

export function FdaInsightsPanel({ substanceName }: FdaInsightsPanelProps) {
  const { reactions, totalEvents, isLoading } =
    useFdaInsights(substanceName);

  if (!substanceName) return null;

  if (isLoading) {
    return (
      <Card className="p-3 bg-muted/50 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </Card>
    );
  }

  if (totalEvents === 0) return null;

  const top5 = reactions.slice(0, 5);
  const maxCount = top5[0]?.count ?? 1;

  return (
    <Card className="p-3 bg-muted/50">
      <p className="text-xs font-medium mb-2">
        FDA Adverse Event Data — {totalEvents.toLocaleString()} reports
      </p>
      <div className="space-y-1.5">
        {top5.map((r) => {
          const pct = Math.round((r.count / totalEvents) * 100);
          const barWidth = Math.round((r.count / maxCount) * 100);
          return (
            <div key={r.term} className="text-xs">
              <div className="flex justify-between mb-0.5">
                <span className="truncate mr-2">{r.term}</span>
                <span className="text-muted-foreground shrink-0">
                  {pct}%
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/40 rounded-full"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">
        Source: FDA Adverse Event Reporting System (FAERS). Reporting rates are
        not incidence rates.
      </p>
    </Card>
  );
}
