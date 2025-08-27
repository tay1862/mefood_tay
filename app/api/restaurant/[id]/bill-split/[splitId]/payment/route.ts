import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; splitId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: restaurantId, splitId } = await params
    const body = await request.json()
    const { paymentAmount, paymentMethod = 'CASH', notes } = body

    if (!paymentAmount || paymentAmount <= 0) {
      return NextResponse.json(
        { error: 'Payment amount must be greater than 0' },
        { status: 400 }
      )
    }

    // Get bill split with related data
    const billSplit = await prisma.billSplit.findFirst({
      where: {
        id: splitId,
        qrSession: {
          table: {
            userId: session.user.id
          }
        }
      },
      include: {
        qrSession: {
          include: {
            table: true,
            orders: {
              include: {
                items: {
                  include: {
                    menuItem: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!billSplit) {
      return NextResponse.json({ error: 'Bill split not found' }, { status: 404 })
    }

    const remainingAmount = Number(billSplit.totalAmount) - Number(billSplit.paidAmount)
    const paymentAmountNum = Number(paymentAmount)

    if (paymentAmountNum > remainingAmount) {
      return NextResponse.json(
        { error: `Payment amount (${paymentAmountNum}) exceeds remaining amount (${remainingAmount})` },
        { status: 400 }
      )
    }

    // Update bill split payment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update bill split
      const newPaidAmount = Number(billSplit.paidAmount) + paymentAmountNum
      const newStatus = newPaidAmount >= Number(billSplit.totalAmount) ? 'PAID' : 'PARTIAL_PAID'

      const updatedBillSplit = await tx.billSplit.update({
        where: { id: splitId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
          updatedAt: new Date()
        }
      })

      // Create payment record
      const paymentNumber = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
      
      // Get session data for payment snapshot
      const qrSession = billSplit.qrSession
      const table = qrSession.table
      
      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          sessionId: qrSession.id, // Using QR session ID as session reference
          userId: session.user.id,
          
          // Customer and session snapshot
          customerName: qrSession.customerName || 'QR Customer',
          customerPhone: null,
          customerEmail: null,
          partySize: qrSession.guestCount,
          tableNumber: table.number,
          tableName: table.name,
          checkInTime: qrSession.startedAt,
          checkOutTime: new Date(),
          
          // Restaurant snapshot
          restaurantName: session.user.restaurantName || 'Restaurant',
          restaurantAddress: session.user.restaurantAddress,
          restaurantPhone: session.user.restaurantPhone,
          
          // Payment details
          paymentMethod: paymentMethod as any,
          subtotalAmount: paymentAmountNum,
          discountAmount: 0,
          extraChargesAmount: 0,
          finalAmount: paymentAmountNum,
          receivedAmount: paymentMethod === 'CASH' ? paymentAmountNum : null,
          changeAmount: 0,
          notes: notes || `Split bill payment - ${splitId}`
        }
      })

      // Create payment items for this split portion
      const allItems = qrSession.orders.flatMap(order => order.items)
      const splitRatio = paymentAmountNum / Number(billSplit.totalAmount)
      
      for (const item of allItems) {
        const itemSplitAmount = Number(item.price) * item.quantity * splitRatio
        
        await tx.paymentItem.create({
          data: {
            paymentId: payment.id,
            menuItemName: item.menuItem.name,
            menuItemDescription: item.menuItem.description,
            menuItemPrice: Number(item.menuItem.price),
            categoryName: 'Split Bill Item',
            quantity: Math.round(item.quantity * splitRatio * 100) / 100, // Round to 2 decimal places
            unitPrice: Number(item.price),
            totalPrice: itemSplitAmount,
            notes: item.notes,
            selections: item.selections
          }
        })
      }

      return {
        billSplit: updatedBillSplit,
        payment,
        remainingAmount: Number(billSplit.totalAmount) - newPaidAmount
      }
    })

    return NextResponse.json({
      success: true,
      ...result,
      message: 'Payment processed successfully'
    })
  } catch (error) {
    console.error('Error processing split bill payment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; splitId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { splitId } = await params

    // Get bill split with payment history
    const billSplit = await prisma.billSplit.findFirst({
      where: {
        id: splitId,
        qrSession: {
          table: {
            userId: session.user.id
          }
        }
      },
      include: {
        qrSession: {
          include: {
            table: true
          }
        }
      }
    })

    if (!billSplit) {
      return NextResponse.json({ error: 'Bill split not found' }, { status: 404 })
    }

    // Get related payments (simplified - in real app, you'd need better tracking)
    const payments = await prisma.payment.findMany({
      where: {
        notes: {
          contains: splitId
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      billSplit,
      payments,
      remainingAmount: Number(billSplit.totalAmount) - Number(billSplit.paidAmount)
    })
  } catch (error) {
    console.error('Error fetching split bill payment info:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

