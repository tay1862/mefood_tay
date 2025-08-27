import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { canAccessAdmin, getRestaurantOwnerId } from '@/lib/auth-utils'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin access
    if (!(await canAccessAdmin())) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Get restaurant owner ID
    const restaurantOwnerId = await getRestaurantOwnerId()
    if (!restaurantOwnerId) {
      return NextResponse.json({ error: 'Restaurant owner not found' }, { status: 404 })
    }

    // Get active QR sessions for this restaurant
    const qrSessions = await prisma.qRSession.findMany({
      where: {
        isActive: true,
        table: {
          userId: restaurantOwnerId
        }
      },
      include: {
        table: {
          select: {
            number: true,
            name: true
          }
        },
        orders: {
          include: {
            items: {
              include: {
                menuItem: {
                  select: {
                    name: true,
                    price: true
                  }
                }
              }
            }
          }
        },
        staffCalls: {
          where: {
            status: {
              in: ['PENDING', 'ACKNOWLEDGED']
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        musicRequests: {
          where: {
            status: {
              in: ['PENDING', 'APPROVED']
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        startedAt: 'desc'
      }
    })

    // Format response
    const formattedSessions = qrSessions.map(session => ({
      id: session.id,
      sessionToken: session.sessionToken,
      customerName: session.customerName,
      guestCount: session.guestCount,
      isActive: session.isActive,
      startedAt: session.startedAt,
      table: {
        number: session.table.number,
        name: session.table.name
      },
      orders: session.orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: parseFloat(order.totalAmount.toString()),
        items: order.items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: parseFloat(item.price.toString()),
          menuItem: {
            name: item.menuItem.name,
            price: parseFloat(item.menuItem.price.toString())
          }
        }))
      })),
      staffCalls: session.staffCalls.map(call => ({
        id: call.id,
        type: call.type,
        message: call.message,
        status: call.status,
        createdAt: call.createdAt
      })),
      musicRequests: session.musicRequests.map(request => ({
        id: request.id,
        songTitle: request.songTitle,
        artist: request.artist,
        message: request.message,
        status: request.status,
        createdAt: request.createdAt
      }))
    }))

    return NextResponse.json(formattedSessions)

  } catch (error) {
    console.error('Error fetching QR sessions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

