import { useState } from "react";
import { Bell, CheckCheck, Zap, Wrench, TrendingUp, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useRole } from "@/contexts/RoleContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const TIPO_CONFIG = {
  feature: { label: "Novidade", color: "bg-blue-500", icon: Zap },
  fix: { label: "Correção", color: "bg-green-500", icon: Wrench },
  improvement: { label: "Melhoria", color: "bg-amber-500", icon: TrendingUp },
  breaking: { label: "Atenção", color: "bg-red-500", icon: AlertTriangle },
} as const;

export function ChangelogBell() {
  const { roleInfo } = useRole();
  const colaboradorId = roleInfo?.colaboradorId ?? 0;
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: items = [] } = trpc.changelog.list.useQuery(undefined, {
    enabled: colaboradorId > 0,
    refetchInterval: 60000,
  });

  const { data: unreadData } = trpc.changelog.unreadCount.useQuery(
    { colaboradorId },
    { enabled: colaboradorId > 0, refetchInterval: 60000 }
  );

  const markRead = trpc.changelog.markRead.useMutation({
    onSuccess: () => {
      utils.changelog.unreadCount.invalidate();
      utils.changelog.list.invalidate();
    },
  });

  const markAllRead = trpc.changelog.markAllRead.useMutation({
    onSuccess: () => {
      utils.changelog.unreadCount.invalidate();
      utils.changelog.list.invalidate();
    },
  });

  const unreadCount = unreadData?.count ?? 0;

  const isUnread = (item: { lidoPor: unknown }) => {
    const lidos = (item.lidoPor as number[]) ?? [];
    return !lidos.includes(colaboradorId);
  };

  const handleOpen = (val: boolean) => {
    setOpen(val);
  };

  const handleMarkAllRead = () => {
    if (colaboradorId > 0) {
      markAllRead.mutate({ colaboradorId });
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Atualizações do sistema"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#c8a96e] text-[10px] font-bold text-black">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 border border-border/50 shadow-xl"
        align="end"
        side="right"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[#c8a96e]" />
            <span className="font-semibold text-sm">Atualizações</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 bg-[#c8a96e]/20 text-[#c8a96e] border-[#c8a96e]/30">
                {unreadCount} nova{unreadCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>

        {/* Lista */}
        <ScrollArea className="max-h-80">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Nenhuma atualização</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {items.map((item) => {
                const unread = isUnread(item);
                const config = TIPO_CONFIG[item.tipo as keyof typeof TIPO_CONFIG] ?? TIPO_CONFIG.feature;
                const Icon = config.icon;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors",
                      unread && "bg-[#c8a96e]/5 border-l-2 border-l-[#c8a96e]"
                    )}
                    onClick={() => {
                      if (unread && colaboradorId > 0) {
                        markRead.mutate({ id: item.id, colaboradorId });
                      }
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <div className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full", config.color)}>
                        <Icon className="h-3 w-3 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={cn("text-xs font-medium", unread ? "text-foreground" : "text-muted-foreground")}>
                            {item.titulo}
                          </span>
                          {unread && (
                            <span className="h-1.5 w-1.5 rounded-full bg-[#c8a96e] shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {item.descricao}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground/60">
                            v{item.versao}
                          </span>
                          <span className="text-[10px] text-muted-foreground/40">·</span>
                          <span className="text-[10px] text-muted-foreground/60">
                            {new Date(item.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
