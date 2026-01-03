'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface RecentActivitiesProps {
  activities: Array<{
    id: string;
    orderCode: string;
    customer: string;
    status: string;
    createdAt: string;
  }>;
}

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  'pending': 'destructive',
  'chờ duyệt': 'destructive',
  'new': 'destructive',
  'approved': 'default',
  'đã duyệt': 'default',
  'completed': 'secondary',
  'hoàn thành': 'secondary',
};

export function RecentActivities({ activities }: RecentActivitiesProps) {
  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const normalizedStatus = status.toLowerCase().trim();
    return statusVariants[normalizedStatus] || 'outline';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Hoạt động gần đây
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Chưa có hoạt động nào
          </p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start justify-between border-b pb-2.5 last:border-0 last:pb-0"
              >
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium">{activity.orderCode}</p>
                    <Badge variant={getStatusVariant(activity.status)} className="text-[10px] px-1.5 py-0">
                      {activity.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{activity.customer}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.createdAt), { 
                      addSuffix: true,
                      locale: vi 
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
