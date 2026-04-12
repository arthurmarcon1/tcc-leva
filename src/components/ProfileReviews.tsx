import { useState, useEffect } from "react";
import { Star, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name: string;
}

interface ProfileReviewsProps {
  userId: string;
}

export function ProfileReviews({ userId }: ProfileReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, reviewer_id")
        .eq("reviewed_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (!data || data.length === 0) {
        setLoading(false);
        return;
      }

      const reviewerIds = [...new Set(data.map((r) => r.reviewer_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", reviewerIds);

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name || "Usuário"]));

      const enriched = data.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        reviewer_name: profileMap.get(r.reviewer_id) || "Usuário",
      }));

      setReviews(enriched);
      setAvgRating(data.reduce((sum, r) => sum + r.rating, 0) / data.length);
      setLoading(false);
    };

    fetchReviews();
  }, [userId]);

  if (loading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-card rounded-xl p-4 shadow-card border border-border"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Star size={16} className="text-primary" />
          Avaliações
        </h3>
        {avgRating !== null && (
          <div className="flex items-center gap-1">
            <span className="text-lg font-bold text-foreground">{avgRating.toFixed(1)}</span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={14}
                  className={s <= Math.round(avgRating) ? "text-primary fill-primary" : "text-muted-foreground/30"}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground ml-1">({reviews.length})</span>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhuma avaliação ainda</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="flex gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs bg-secondary text-muted-foreground">
                  {review.reviewer_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{review.reviewer_name}</span>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={10}
                        className={s <= review.rating ? "text-primary fill-primary" : "text-muted-foreground/30"}
                      />
                    ))}
                  </div>
                </div>
                {review.comment && (
                  <p className="text-xs text-muted-foreground mt-0.5">{review.comment}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
