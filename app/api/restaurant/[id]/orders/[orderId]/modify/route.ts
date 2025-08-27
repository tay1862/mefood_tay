import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PATCH(
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
    const { items, notes } = body

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      )
    }

    // Check if order exists and belongs to user
    const existingOrder = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: session.user.id
      },
      include: {
        items: true
      }
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if order can be modified (only PENDING or CONFIRMED orders)
    if (!['PENDING', 'CONFIRMED'].includes(existingOrder.status)) {
      return NextResponse.json(
        { error: 'Order cannot be modified in current status' },
        { status: 400 }
      )
    }

    // Calculate new total amount
    let newTotalAmount = 0
    const itemsToCreate = []
    const itemsToUpdate = []
    const itemsToDelete = []

    for (const item of items) {
      if (item.quantity <= 0) {
        // Mark for deletion if quantity is 0 or negative
        if (item.id) {
          itemsToDelete.push(item.id)
        }
        continue
      }

      // Validate menu item exists
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId }
      })

      if (!menuItem) {
        return NextResponse.json(
          { error: `Menu item ${item.menuItemId} not found` },
          { status: 400 }
        )
      }

      // Calculate item price (base price + selections)
      let itemPrice = Number(menuItem.price)
      
      if (item.selections) {
        // Add selection prices (simplified - in real app, validate selections)
        for (const selection of item.selections) {
          if (selection.priceAdd) {
            itemPrice += Number(selection.priceAdd)
          }
        }
      }

      const totalItemPrice = itemPrice * item.quantity
      newTotalAmount += totalItemPrice

      if (item.id) {
        // Update existing item
        itemsToUpdate.push({
          id: item.id,
          quantity: item.quantity,
          price: itemPrice,
          notes: item.notes,
          selections: item.selections
        })
      } else {
        // Create new item
        itemsToCreate.push({
          quantity: item.quantity,
          price: itemPrice,
          notes: item.notes,
          selections: item.selections,
          menuItemId: item.menuItemId,
          orderId: orderId
        })
      }
    }

    // Perform database operations in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete items marked for deletion
      if (itemsToDelete.length > 0) {
        await tx.orderItem.deleteMany({
          where: {
            id: { in: itemsToDelete },
            orderId: orderId
          }
        })
      }

      // Update existing items
      for (const item of itemsToUpdate) {
        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            quantity: item.quantity,
            price: item.price,
            notes: item.notes,
            selections: item.selections
          }
        })
      }

      // Create new items
      if (itemsToCreate.length > 0) {
        await tx.orderItem.createMany({
          data: itemsToCreate
        })
      }

      // Update order total and notes
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          totalAmount: newTotalAmount,
          notes: notes,
          updatedAt: new Date()
        },
        include: {
          items: {
            include: {
              menuItem: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  image: true
                }
              }
            }
          },
          table: true,
          qrSession: true
        }
      })

      return updatedOrder
    })

    return NextResponse.json({
      success: true,
      order: result,
      message: 'Order modified successfully'
    })
  } catch (error) {
    console.error('Error modifying order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

