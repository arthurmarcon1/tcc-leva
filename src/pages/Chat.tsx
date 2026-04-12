import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { ChatConversationList } from "@/components/ChatConversationList";
import { ChatMessageView } from "@/components/ChatMessageView";
import { useConversations, ConversationWithProfile } from "@/hooks/useConversations";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export default function Chat() {
  const { data: conversations, isLoading } = useConversations();
  const [selected, setSelected] = useState<ConversationWithProfile | null>(null);
  const location = useLocation();

  useEffect(() => {
    const convId = location.state?.conversationId;
    if (convId && conversations?.length) {
      const found = conversations.find((c) => c.id === convId);
      if (found) {
        setSelected(found);
      } else {
        // Conversation exists but not yet in list, create a minimal entry
        supabase
          .from("conversations")
          .select("*")
          .eq("id", convId)
          .single()
          .then(({ data }) => {
            if (data) {
              setSelected({
                id: data.id,
                other_user_id: "",
                other_user_name: "Motorista",
                other_user_avatar: null,
                updated_at: data.updated_at,
              });
            }
          });
      }
      // Clear state to avoid re-selecting on re-renders
      window.history.replaceState({}, document.title);
    }
  }, [location.state, conversations]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!selected && <Header />}

      <div className="flex-1 flex flex-col" style={{ height: selected ? "100vh" : "calc(100vh - 120px)" }}>
        {selected ? (
          <ChatMessageView
            conversationId={selected.id}
            otherUserName={selected.other_user_name}
            otherUserAvatar={selected.other_user_avatar}
            onBack={() => setSelected(null)}
          />
        ) : isLoading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ChatConversationList
            conversations={conversations || []}
            onSelect={setSelected}
            selectedId={selected?.id}
          />
        )}
      </div>

      {!selected && <BottomNav />}
    </div>
  );
}
