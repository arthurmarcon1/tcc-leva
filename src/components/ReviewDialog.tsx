import { useState } from "react";
import { Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipmentRequestId: string;
  reviewedId: string;
  reviewedName: string;
  onReviewSubmitted: () => void;
}

export function ReviewDialog({
  open,
  onOpenChange,
  shipmentRequestId,
  reviewedId,
  reviewedName,
  onReviewSubmitted,
}: ReviewDialogProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || rating === 0) return;
    setSubmitting(true);

    const { error } = await supabase.from("reviews").insert({
      shipment_request_id: shipmentRequestId,
      reviewer_id: user.id,
      reviewed_id: reviewedId,
      rating,
      comment: comment.trim() || null,
    });

    setSubmitting(false);
    if (error) {
      if (error.code === "23505") {
        toast.error("Você já avaliou este envio");
      } else {
        toast.error("Erro ao enviar avaliação");
      }
    } else {
      toast.success("Avaliação enviada!");
      setRating(0);
      setComment("");
      onOpenChange(false);
      onReviewSubmitted();
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Avaliar {reviewedName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  size={32}
                  className={
                    star <= displayRating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }
                />
              </button>
            ))}
          </div>

          <Textarea
            placeholder="Deixe um comentário (opcional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />

          <Button
            className="w-full"
            disabled={rating === 0 || submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Enviando..." : "Enviar avaliação"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
