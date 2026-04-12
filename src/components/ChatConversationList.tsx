import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ConversationWithProfile } from "@/hooks/useConversations";
import { MessageCircle } from "lucide-react";

interface Props {
  conversations: ConversationWithProfile[];
  onSelect: (conv: ConversationWithProfile) => void;
  selectedId?: string;
}

export function ChatConversationList({ conversations, onSelect, selectedId }: Props) {
  if (!conversations.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-16">
        <MessageCircle size={48} className="mb-4 opacity-40" />
        <p className="text-sm">Nenhuma conversa ainda</p>
        <p className="text-xs mt-1">Inicie uma conversa a partir de uma viagem</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y divide-border">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv)}
            className={`w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-secondary/50 ${
              selectedId === conv.id ? "bg-secondary" : ""
            }`}
          >
            <Avatar className="h-12 w-12">
              <AvatarImage src={conv.other_user_avatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {conv.other_user_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <span className="font-semibold text-sm text-foreground truncate">
                  {conv.other_user_name}
                </span>
                <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                  {formatDistanceToNow(new Date(conv.updated_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {conv.last_message || "Sem mensagens"}
              </p>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
