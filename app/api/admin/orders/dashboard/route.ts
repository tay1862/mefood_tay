import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department')
    const status = searchParams.get('status')

    // Base query conditions
    const whereConditions: any = {
      userId: session.user.id,
      status: {
        not: 'CANCELLED'
      }
    }

    // Filter by status if provided
    if (status && status !== 'all') {
      whereConditions.status = status
    }

    // Filter by department if provided
    if (department && department !== 'all') {
      whereConditions.items = {
        some: {
          menuItem: {
            department: {
              name: department
            }
          }
        }
      }
    }

    // Get orders with related data
    const orders = await prisma.order.findMany({
      where: whereConditions,
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                department: true,
                category: true
              }
            }
          }
        },
        table: true,
        qrSession: true,
        waiter: {
          select: {
            id: true,
            ownerName: true
          }
        },
        cook: {
          select: {
            id: true,
            ownerName: true
          }
        }
      },
      orderBy: [
        { status: 'asc' },
        { orderedAt: 'asc' }
      ]
    })

    // Get order statistics
    const stats = await prisma.order.groupBy({
      by: ['status'],
      where: {
        userId: session.user.id,
        orderedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)) // Today
        }
      },
      _count: {
        id: true
      }
    })

    // Get department statistics
    const departmentStats = await prisma.order.findMany({
      where: {
        userId: session.user.id,
        status: {
          in: ['PENDING', 'CONFIRMED', 'PREPARING']
        }
      },
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                department: true
              }
            }
          }
        }
      }
    })

    // Process department statistics
    const deptStats: { [key: string]: number } = {}
    departmentStats.forEach(order => {
      order.items.forEach(item => {
        const deptName = item.menuItem.department?.name || 'Unassigned'
        deptStats[deptName] = (deptStats[deptName] || 0) + item.quantity
      })
    })

    // Get available departments
    const departments = await prisma.department.findMany({
      where: {
        userId: session.user.id
      },
      select: {
        id: true,
        name: true,
        description: true
      }
    })

    return NextResponse.json({
      orders,
      statistics: {
        byStatus: stats.reduce((acc: any, stat) => {
          acc[stat.status] = stat._count.id
          return acc
        }, {}),
        byDepartment: deptStats
      },
      departments
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { orderId, action, userId } = body

    if (!orderId || !action) {
      return NextResponse.json(
        { error: 'Order ID and action are required' },
        { status: 400 }
      )
    }

    // Verify order belongs to user
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: session.user.id
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    let updateData: any = {}

    switch (action) {
      case 'confirm':
        if (order.status !== 'PENDING') {
          return NextResponse.json(
            { error: 'Order cannot be confirmed in current status' },
            { status: 400 }
          )
        }
        updateData = {
          status: 'CONFIRMED',
          waiterId: userId || session.user.id
        }
        break

      case 'start_preparing':
        if (order.status !== 'CONFIRMED') {
          return NextResponse.json(
            { error: 'Order cannot be started in current status' },
            { status: 400 }
          )
        }
        updateData = {
          status: 'PREPARING',
          preparingAt: new Date(),
          cookId: userId || session.user.id
        }
        break

      case 'mark_ready':
        if (order.status !== 'PREPARING') {
          return NextResponse.json(
            { error: 'Order cannot be marked ready in current status' },
            { status: 400 }
          )
        }
        updateData = {
          status: 'READY',
          readyAt: new Date()
        }
        break

      case 'mark_delivered':
        if (order.status !== 'READY') {
          return NextResponse.json(
            { error: 'Order cannot be marked delivered in current status' },
            { status: 400 }
          )
        }
        updateData = {
          status: 'DELIVERED',
          servedAt: new Date(),
          servedBy: userId || session.user.id
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                department: true
              }
            }
          }
        },
        table: true,
        qrSession: true
      }
    })

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: `Order ${action.replace('_', ' ')} successfully`
    })
  } catch (error) {
    console.error('Error updating order status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

