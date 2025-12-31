import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Ban, Pause, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface AtRiskItem {
  id: number;
  title: string;
  project_name: string;
  days_overdue?: number;
  blocked_days?: number;
  idle_days?: number;
  reason?: string;
  status?: string;
}

interface AtRiskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'overdue' | 'blocked' | 'stale' | null;
  items: AtRiskItem[];
  onTaskClick: (taskId: number) => void;
}

export function AtRiskDetailDialog({
  open,
  onOpenChange,
  type,
  items,
  onTaskClick
}: AtRiskDetailDialogProps) {
  if (!type) return null;

  const config = {
    overdue: {
      title: '逾期任务',
      icon: <Clock className="h-5 w-5 text-red-600" />,
      description: '以下任务已超过计划完成日期',
      color: 'text-red-600'
    },
    blocked: {
      title: '阻塞任务',
      icon: <Ban className="h-5 w-5 text-orange-600" />,
      description: '以下任务当前处于阻塞状态',
      color: 'text-orange-600'
    },
    stale: {
      title: '停滞任务',
      icon: <Pause className="h-5 w-5 text-yellow-600" />,
      description: '以下任务7天以上未更新',
      color: 'text-yellow-600'
    }
  };

  const currentConfig = config[type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentConfig.icon}
            {currentConfig.title}
          </DialogTitle>
          <DialogDescription>
            {currentConfig.description} ({items.length} 项)
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无数据
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-sm truncate">
                        {item.title}
                      </h4>
                      {item.status && (
                        <Badge variant="outline" className="text-xs">
                          {item.status === 'in_progress' ? '进行中' :
                           item.status === 'not_started' ? '未开始' : '搁置'}
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>项目: {item.project_name}</div>

                      {type === 'overdue' && item.days_overdue !== undefined && (
                        <div className={currentConfig.color}>
                          逾期 {Math.floor(item.days_overdue)} 天
                        </div>
                      )}

                      {type === 'blocked' && (
                        <>
                          {item.blocked_days !== undefined && (
                            <div className={currentConfig.color}>
                              已阻塞 {Math.floor(item.blocked_days)} 天
                            </div>
                          )}
                          {item.reason && (
                            <div className="text-xs mt-1 p-2 bg-muted rounded">
                              原因: {item.reason}
                            </div>
                          )}
                        </>
                      )}

                      {type === 'stale' && item.idle_days !== undefined && (
                        <div className={currentConfig.color}>
                          {Math.floor(item.idle_days)} 天未更新
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onTaskClick(item.id);
                      onOpenChange(false);
                    }}
                    className="flex-shrink-0"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    查看
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
