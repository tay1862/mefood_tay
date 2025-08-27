import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: restaurantId } = await params
    const body = await request.json()
    const { qrSessionId, orderId, splitType, splits } = body

    if (!qrSessionId || !splitType || !splits || !Array.isArray(splits)) {
      return NextResponse.json(
        { error: 'QR Session ID, split type, and splits array are required' },
        { status: 400 }
      )
    }

    // Validate split types
    const validSplitTypes = ['by_item', 'by_person', 'equal_split']
    if (!validSplitTypes.includes(splitType)) {
      return NextResponse.json(
        { error: 'Invalid split type. Must be by_item, by_person, or equal_split' },
        { status: 400 }
      )
    }

    // Get QR session with orders
    const qrSession = await prisma.qRSession.findFirst({
      where: {
        id: qrSessionId,
        table: {
          userId: session.user.id
        }
      },
      include: {
        orders: {
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
            }
          }
        }
      }
    })

    if (!qrSession) {
      return NextResponse.json({ error: 'QR Session not found' }, { status: 404 })
    }

    // Calculate total amount
    const totalAmount = qrSession.orders.reduce((sum, order) => 
      sum + Number(order.totalAmount), 0
    )

    // Validate splits
    let splitTotal = 0
    for (const split of splits) {
      if (!split.amount || split.amount <= 0) {
        return NextResponse.json(
          { error: 'All split amounts must be greater than 0' },
          { status: 400 }
        )
      }
      splitTotal += Number(split.amount)
    }

    // For equal_split and by_person, allow small rounding differences
    const tolerance = 0.01
    if (Math.abs(splitTotal - totalAmount) > tolerance) {
      return NextResponse.json(
        { error: `Split amounts (${splitTotal}) do not match total amount (${totalAmount})` },
        { status: 400 }
      )
    }

    // Create bill splits in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const billSplits = []

      for (const split of splits) {
        const billSplit = await tx.billSplit.create({
          data: {
            totalAmount: Number(split.amount),
            paidAmount: 0,
            status: 'PENDING',
            qrSessionId: qrSessionId,
            orderId: orderId || null
          }
        })

        billSplits.push({
          ...billSplit,
          splitDetails: split
        })
      }

      return billSplits
    })

    return NextResponse.json({
      success: true,
      billSplits: result,
      splitType,
      totalAmount,
      message: 'Bill split created successfully'
    })
  } catch (error) {
    console.error('Error creating bill split:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const qrSessionId = searchParams.get('qrSessionId')

    if (!qrSessionId) {
      return NextResponse.json(
        { error: 'QR Session ID is required' },
        { status: 400 }
      )
    }

    // Get existing bill splits for the session
    const billSplits = await prisma.billSplit.findMany({
      where: {
        qrSessionId: qrSessionId,
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
                    menuItem: {
                      select: {
                        id: true,
                        name: true,
                        price: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      billSplits,
      qrSession: billSplits[0]?.qrSession || null
    })
  } catch (error) {
    console.error('Error fetching bill splits:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

