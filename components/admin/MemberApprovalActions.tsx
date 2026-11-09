'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CheckCircle, XCircle, MoreHorizontal, Eye, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { approveMember, rejectMember, reactivateMember } from '@/utils/membership/handlers';

type Member = {
  id: string;
  user_id: string | null;
  status: string | null;
  fullName: string | null;
  phone: string | null;
  address: string | null;
  isApproved: boolean;
  membershipType: string | null;
  email?: string;
};

interface MemberApprovalActionsProps {
  member: Member;
}

export default function MemberApprovalActions({ member }: MemberApprovalActionsProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const router = useRouter();

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      console.log('Attempting to approve member:', member.id, member.fullName);
      
      await approveMember(member.id);

      console.log('Approval successful');
      toast.success(`${member.fullName} has been approved as a member`);
      router.refresh();
    } catch (error) {
      console.error('Error approving member:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to approve member. Please try again.');
    } finally {
      setIsApproving(false);
      setShowApproveDialog(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      console.log('Attempting to reject member:', member.id, member.fullName);
      
      await rejectMember(member.id);

      console.log('Rejection successful');
      toast.success(`${member.fullName}'s membership has been rejected`);
      router.refresh();
    } catch (error) {
      console.error('Error rejecting member:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reject member. Please try again.');
    } finally {
      setIsRejecting(false);
      setShowRejectDialog(false);
    }
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent(`BCS Seattle - Membership Status Update`);
    const body = encodeURIComponent(`Dear ${member.fullName},\n\nThank you for your interest in BCS Seattle.\n\nBest regards,\nBCS Seattle Team`);
    window.open(`mailto:${member.email}?subject=${subject}&body=${body}`);
  };

  if (!member.isApproved) {
    return (
      <div className="flex items-center space-x-2">
        <Button
          size="sm"
          onClick={() => setShowApproveDialog(true)}
          disabled={isApproving || isRejecting}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          {isApproving ? 'Approving...' : 'Approve'}
        </Button>
        
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setShowRejectDialog(true)}
          disabled={isApproving || isRejecting}
        >
          <XCircle className="h-4 w-4 mr-1" />
          {isRejecting ? 'Rejecting...' : 'Reject'}
        </Button>

        {/* Approve Confirmation Dialog */}
        <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Approve Member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to approve <strong>{member.fullName}</strong> as a member? 
                This will grant them access to member benefits and voting rights.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleApprove}
                disabled={isApproving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isApproving ? 'Approving...' : 'Approve Member'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reject Confirmation Dialog */}
        <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reject Member Application</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to reject <strong>{member.fullName}</strong>'s membership application? 
                This action can be reversed later if needed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReject}
                className="bg-red-600 hover:bg-red-700"
                disabled={isRejecting}
              >
                {isRejecting ? 'Rejecting...' : 'Reject Application'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // For approved or rejected members, show a dropdown with options
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={handleSendEmail}>
          <Mail className="mr-2 h-4 w-4" />
          Send Email
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {member.isApproved && member.status === 'active' && (
          <DropdownMenuItem
            onClick={() => setShowRejectDialog(true)}
            className="text-red-600"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Deactivate Member
          </DropdownMenuItem>
        )}
        {!member.isApproved || member.status === 'inactive' && (
          <DropdownMenuItem
            onClick={() => setShowApproveDialog(true)}
            className="text-green-600"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {member.isApproved ? 'Reactivate Member' : 'Approve Member'}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>

      {/* Reuse the same dialogs for status changes */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {!member.isApproved ? 'Approve Member' : 'Reactivate Member'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {!member.isApproved ? 'approve' : 'reactivate'} <strong>{member.fullName}</strong>? 
              This will grant them access to member benefits and voting rights.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={isApproving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isApproving ? 'Processing...' : (!member.isApproved ? 'Approve' : 'Reactivate')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <strong>{member.fullName}</strong>'s membership? 
              This will remove their member benefits and voting rights.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-red-600 hover:bg-red-700"
              disabled={isRejecting}
            >
              {isRejecting ? 'Processing...' : 'Deactivate Member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DropdownMenu>
  );
}
