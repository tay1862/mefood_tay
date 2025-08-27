import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id || session.user.role?.name !== 'Admin') {
    return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  }

  const { qrSessionId, newTableId } = await request.json();

  if (!qrSessionId || !newTableId) {
    return new NextResponse(JSON.stringify({ message: 'QR Session ID and new Table ID are required' }), { status: 400 });
  }

  try {
    // Find the QR session
    const qrSession = await prisma.qRSession.findUnique({
      where: {
        id: qrSessionId,
      },
    });

    if (!qrSession) {
      return new NextResponse(JSON.stringify({ message: 'QR Session not found' }), { status: 404 });
    }

    // Update the QR session with the new table ID
    await prisma.qRSession.update({
      where: {
        id: qrSessionId,
      },
      data: {
        tableId: newTableId,
      },
    });

    // Also update all associated orders to the new table ID
    await prisma.order.updateMany({
      where: {
        qrSessionId: qrSessionId,
      },
      data: {
        tableId: newTableId,
      },
    });

    return new NextResponse(JSON.stringify({ message: 'Table moved successfully' }), { status: 200 });
  } catch (error) {
    console.error('Error moving table:', error);
    return new NextResponse(JSON.stringify({ message: 'Internal server error' }), { status: 500 });
  }
}

