import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Clock, Ban, Pause, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AtRiskData {
  overdue: {
    stories: Array<{
      id: number;
      title: string;
      days_overdue: number;
      project_name: string;
    }>;
    tasks: Array<{
      id: number;
      title: string;
      days_overdue: number;
      project_name: string;
    }>;
    count: number;
  };
  blocked: {
    tasks: Array<{
      id: number;
      title: string;
      blocked_days: number;
      project_name: string;
      reason?: string;
    }>;
    count: number;
  };
  stale: {
    tasks: Array<{
      id: number;
      title: string;
      idle_days: number;
      project_name: string;
    }>;
    count: number;
  };
  trend: {
    overdueWeekly: number;
    blockedP95: number;
  };
}

interface RiskItemProps {
  icon: ReactNode;
  label: string;
  count: number;
  trend?: number;
  p95?: string;
  onClick: () => void;
  color: 'red' | 'orange' | 'yellow';
}

function RiskItem({ icon, label, count, trend, p95, onClick, color }: RiskItemProps) {
  const colorClasses = {
    red: 'bg-red-50 border-red-200 hover:bg-red-100 text-red-700',
    orange: 'bg-orange-50 border-orange-200 hover:bg-orange-100 text-orange-700',
    yellow: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100 text-yellow-700'
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors",
        colorClasses[color]
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">{icon}</div>
        <div className="text-left">
          <div className="font-semibold">{label}</div>
          {p95 && <div className="text-xs opacity-80">{p95}</div>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {trend !== undefined && trend !== 0 && (
          <div className="flex items-center gap-1 text-xs">
            {trend > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
        <Badge variant="secondary" className="font-bold">
          {count}
        </Badge>
      </div>
    </button>
  );
}

interface AtRiskAlertProps {
  data: AtRiskData | null;
  loading: boolean;
  onItemClick: (type: 'overdue' | 'blocked' | 'stale', data: any) => void;
}

export function AtRiskAlert({ data, loading, onItemClick }: AtRiskAlertProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>风险告警</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">加载中...</div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const totalRisks = data.overdue.count + data.blocked.count + data.stale.count;

  if (totalRisks === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span>一切正常</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            当前迭代无风险项，所有任务进展顺利
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          <span>风险告警</span>
          <Badge variant="destructive" className="ml-auto">
            {totalRisks} 项需要关注
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* 逾期 */}
        {data.overdue.count > 0 && (
          <RiskItem
            icon={<Clock className="h-5 w-5" />}
            label="逾期任务"
            count={data.overdue.count}
            trend={data.trend.overdueWeekly}
            onClick={() => onItemClick('overdue', data.overdue)}
            color="red"
          />
        )}

        {/* 阻塞 */}
        {data.blocked.count > 0 && (
          <RiskItem
            icon={<Ban className="h-5 w-5" />}
            label="阻塞任务"
            count={data.blocked.count}
            p95={`P95: ${data.trend.blockedP95}天`}
            onClick={() => onItemClick('blocked', data.blocked)}
            color="orange"
          />
        )}

        {/* 停滞 */}
        {data.stale.count > 0 && (
          <RiskItem
            icon={<Pause className="h-5 w-5" />}
            label="停滞任务 (7天+无更新)"
            count={data.stale.count}
            onClick={() => onItemClick('stale', data.stale)}
            color="yellow"
          />
        )}
      </CardContent>
    </Card>
  );
}
