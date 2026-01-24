import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/apiAuth';

// POST /api/injury-submissions/[id]/comments - Add a comment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const { id } = await params;
    }

    const body = await req.json();
    const { comment, isInternal } = body;

    if (!comment || comment.trim().length === 0) {
      return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 });
    }

    // Verify submission exists and belongs to club
    const submission = await prisma.injurySubmission.findFirst({
      where: {
        id: id,
        clubId: authResult.user.clubId,
      },
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const newComment = await prisma.injurySubmissionComment.create({
      data: {
        submissionId: id,
        userId: authResult.user.id,
        comment,
        isInternal: isInternal !== false, // Default to internal
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.injurySubmissionAudit.create({
      data: {
        submissionId: id,
        userId: authResult.user.id,
        action: 'COMMENT_ADDED',
        metadata: JSON.stringify({ commentId: newComment.id, isInternal }),
      },
    });

    // Notify assigned user if different from commenter
    if (submission.assignedToUserId && submission.assignedToUserId !== authResult.user.id) {
      await prisma.injuryNotification.create({
        data: {
          clubId: authResult.user.clubId,
          userId: submission.assignedToUserId,
          submissionId: id,
          type: 'COMMENT_ADDED',
          title: 'New Comment on Injury Report',
          message: `${authResult.user.fullName} added a comment to a report you're assigned to.`,
          actionUrl: `/dashboard/injury-reports/${id}`,
        },
      });
    }

    return NextResponse.json({ comment: newComment }, { status: 201 });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    );
  }
}
