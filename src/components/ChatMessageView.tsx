import { useEffect, useRef, useState } from "react";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

interface Props {
  conversationId: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  onBack: () => void;
}

export function ChatMessageView({ conversationId, otherUserName, otherUserAvatar, onBack }: Props) {
  const { user } = useAuth();
  const { data: messages, sendMessage } = useMessages(conversationId);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    await sendMessage(trimmed);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft size={20} />
        </button>
        <Avatar className="h-9 w-9">
          <AvatarImage src={otherUserAvatar || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
            {otherUserName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="font-semibold text-sm text-foreground">{otherUserName}</span>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages?.map((msg) => {
            const isMine = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    isMine
                      ? "gradient-primary text-primary-foreground rounded-br-md"
                      : "bg-secondary text-secondary-foreground rounded-bl-md"
                  }`}
                >
                  <p>{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {format(new Date(msg.created_at), "HH:mm")}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-border bg-card flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Digite uma mensagem..."
          className="flex-1"
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
        />
        <Button size="icon" onClick={handleSend} disabled={!text.trim()}>
          <Send size={18} />
        </Button>
      </div>
    </div>
  );
}
