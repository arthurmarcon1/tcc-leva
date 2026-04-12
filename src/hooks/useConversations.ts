import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ConversationWithProfile {
  id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string | null;
  updated_at: string;
  last_message?: string;
}

export function useConversations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: convos, error } = await supabase
        .from("conversations")
        .select("*")
        .or(`user1_id.eq.${user!.id},user2_id.eq.${user!.id}`)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      if (!convos?.length) return [];

      const otherUserIds = convos.map((c) =>
        c.user1_id === user!.id ? c.user2_id : c.user1_id
      );

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", otherUserIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      // Get last message for each conversation
      const results: ConversationWithProfile[] = [];
      for (const c of convos) {
        const otherId = c.user1_id === user!.id ? c.user2_id : c.user1_id;
        const profile = profileMap.get(otherId);

        const { data: lastMsg } = await supabase
          .from("messages")
          .select("content")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        results.push({
          id: c.id,
          other_user_id: otherId,
          other_user_name: profile?.full_name || "Usuário",
          other_user_avatar: profile?.avatar_url || null,
          updated_at: c.updated_at,
          last_message: lastMsg?.content,
        });
      }

      return results;
    },
  });
}
