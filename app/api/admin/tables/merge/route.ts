import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id || session.user.role?.name !== 'Admin') {
    return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  }

  const { sourceTableId, targetTableId } = await request.json();

  if (!sourceTableId || !targetTableId) {
    return new NextResponse(JSON.stringify({ message: 'Source and target table IDs are required' }), { status: 400 });
  }

  try {
    // Find the source and target QR sessions
    const sourceQrSession = await prisma.qRSession.findFirst({
      where: {
        tableId: sourceTableId,
        isActive: true,
        endedAt: null,
      },
    });

    const targetQrSession = await prisma.qRSession.findFirst({
      where: {
        tableId: targetTableId,
        isActive: true,
        endedAt: null,
      },
    });

    if (!sourceQrSession || !targetQrSession) {
      return new NextResponse(JSON.stringify({ message: 'Active QR sessions not found for one or both tables' }), { status: 404 });
    }

    // Update orders from source session to target session
    await prisma.order.updateMany({
      where: {
        qrSessionId: sourceQrSession.id,
      },
      data: {
        qrSessionId: targetQrSession.id,
        tableId: targetTableId, // Also update tableId for orders
      },
    });

    // Update staff calls from source session to target session
    await prisma.staffCall.updateMany({
      where: {
        qrSessionId: sourceQrSession.id,
      },
      data: {
        qrSessionId: targetQrSession.id,
      },
    });

    // Update music requests from source session to target session
    await prisma.musicRequest.updateMany({
      where: {
        qrSessionId: sourceQrSession.id,
      },
      data: {
        qrSessionId: targetQrSession.id,
      },
    });

    // Mark source QR session as merged and inactive
    await prisma.qRSession.update({
      where: {
        id: sourceQrSession.id,
      },
      data: {
        isActive: false,
        endedAt: new Date(),
        mergedIntoQrSessionId: targetQrSession.id,
      },
    });

    return new NextResponse(JSON.stringify({ message: 'Tables merged successfully' }), { status: 200 });
  } catch (error) {
    console.error('Error merging tables:', error);
    return new NextResponse(JSON.stringify({ message: 'Internal server error' }), { status: 500 });
  }
}

