import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: _, orderId } = await params
    const body = await request.json()
    const { reason, notes } = body

    if (!reason) {
      return NextResponse.json(
        { error: 'Cancellation reason is required' },
        { status: 400 }
      )
    }

    // Check if order exists and belongs to user
    const existingOrder = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: session.user.id
      }
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if order can be cancelled (not already delivered or cancelled)
    if (existingOrder.status === 'DELIVERED' || existingOrder.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Order cannot be cancelled in current status' },
        { status: 400 }
      )
    }

    // Find or create cancellation reason
    let cancellationReason = await prisma.cancellationReason.findUnique({
      where: { reason }
    })

    if (!cancellationReason) {
      cancellationReason = await prisma.cancellationReason.create({
        data: { reason }
      })
    }

    // Update order status to cancelled with reason
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancellationReasonId: cancellationReason.id,
        notes: notes ? `${existingOrder.notes || ''}\nCancellation: ${notes}`.trim() : existingOrder.notes
      },
      include: {
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                price: true
              }
            }
          }
        },
        cancellationReason: true,
        table: true,
        qrSession: true
      }
    })

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'Order cancelled successfully'
    })
  } catch (error) {
    console.error('Error cancelling order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

