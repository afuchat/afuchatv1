import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Package, MapPin, XCircle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { CustomLoader } from '@/components/ui/CustomLoader';

interface SupportChatActionsProps {
  orderId?: string;
  orderNumber?: string;
  chatId: string;
  userId: string;
}

export default function SupportChatActions({ orderId, orderNumber, chatId, userId }: SupportChatActionsProps) {
  const navigate = useNavigate();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTrackOrder = () => {
    if (orderNumber) {
      navigate(`/orders/${orderNumber}`);
    } else {
      navigate('/orders');
    }
  };

  const handleViewDetails = () => {
    if (orderNumber) {
      navigate(`/orders/${orderNumber}`);
    } else {
      navigate('/orders');
    }
  };

  const handleCancelRequest = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }

    setIsSubmitting(true);
    try {
      // Send cancellation request message
      await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: userId,
        encrypted_content: `❌ **Cancellation Request**\n\nOrder: ${orderNumber || 'Not specified'}\nReason: ${cancelReason}\n\nPlease review and process this cancellation request.`
      });

      toast.success('Cancellation request submitted');
      setShowCancelDialog(false);
      setCancelReason('');
    } catch (error) {
      console.error('Error submitting cancellation:', error);
      toast.error('Failed to submit cancellation request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefundRequest = async () => {
    if (!refundReason.trim()) {
      toast.error('Please provide a reason for refund');
      return;
    }

    setIsSubmitting(true);
    try {
      // Send refund request message
      await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: userId,
        encrypted_content: `💰 **Refund Request**\n\nOrder: ${orderNumber || 'Not specified'}\nReason: ${refundReason}\n\nPlease review and process this refund request.`
      });

      toast.success('Refund request submitted');
      setShowRefundDialog(false);
      setRefundReason('');
    } catch (error) {
      console.error('Error submitting refund:', error);
      toast.error('Failed to submit refund request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card className="mx-4 mb-4">
        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground mb-3 text-center">Quick Actions</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex flex-col h-auto py-3 gap-1"
              onClick={handleTrackOrder}
            >
              <MapPin className="h-4 w-4" />
              <span className="text-xs">Track Order</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex flex-col h-auto py-3 gap-1"
              onClick={handleViewDetails}
            >
              <Package className="h-4 w-4" />
              <span className="text-xs">View Details</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex flex-col h-auto py-3 gap-1 text-yellow-600 hover:text-yellow-700"
              onClick={() => setShowCancelDialog(true)}
            >
              <XCircle className="h-4 w-4" />
              <span className="text-xs">Cancel Order</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex flex-col h-auto py-3 gap-1 text-blue-600 hover:text-blue-700"
              onClick={() => setShowRefundDialog(true)}
            >
              <RotateCcw className="h-4 w-4" />
              <span className="text-xs">Request Refund</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cancel Order Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancelling your order. Our team will review your request.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Why do you want to cancel this order?"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelRequest}
              disabled={isSubmitting}
            >
              {isSubmitting ? <CustomLoader size="sm" /> : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Request Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Refund</DialogTitle>
            <DialogDescription>
              Please explain why you're requesting a refund. Our team will review and get back to you.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Why are you requesting a refund?"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefundDialog(false)}>
              Back
            </Button>
            <Button
              onClick={handleRefundRequest}
              disabled={isSubmitting}
            >
              {isSubmitting ? <CustomLoader size="sm" /> : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
