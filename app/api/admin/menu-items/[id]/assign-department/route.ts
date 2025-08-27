import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { canAccessAdmin, getRestaurantOwnerId } from '@/lib/auth-utils'

const prisma = new PrismaClient()

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin access
    if (!(await canAccessAdmin())) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { departmentId } = body

    // Get restaurant owner ID
    const restaurantOwnerId = await getRestaurantOwnerId()
    if (!restaurantOwnerId) {
      return NextResponse.json({ error: 'Restaurant owner not found' }, { status: 404 })
    }

    // Check if menu item exists and belongs to this restaurant
    const existingMenuItem = await prisma.menuItem.findFirst({
      where: {
        id: params.id,
        userId: restaurantOwnerId
      },
      include: {
        category: true,
        department: true
      }
    })

    if (!existingMenuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    // If departmentId is provided, verify it exists and belongs to this restaurant
    if (departmentId) {
      const department = await prisma.department.findFirst({
        where: {
          id: departmentId,
          userId: restaurantOwnerId
        }
      })

      if (!department) {
        return NextResponse.json(
          { error: 'Invalid department selected' },
          { status: 400 }
        )
      }
    }

    // Update the menu item's department assignment
    const updatedMenuItem = await prisma.menuItem.update({
      where: { id: params.id },
      data: {
        departmentId: departmentId || null
      },
      include: {
        category: true,
        department: true
      }
    })

    // Format response
    const formattedMenuItem = {
      id: updatedMenuItem.id,
      name: updatedMenuItem.name,
      description: updatedMenuItem.description,
      price: updatedMenuItem.price,
      image: updatedMenuItem.image,
      isActive: updatedMenuItem.isActive,
      isAvailable: updatedMenuItem.isAvailable,
      sortOrder: updatedMenuItem.sortOrder,
      category: {
        id: updatedMenuItem.category.id,
        name: updatedMenuItem.category.name
      },
      department: updatedMenuItem.department ? {
        id: updatedMenuItem.department.id,
        name: updatedMenuItem.department.name,
        description: updatedMenuItem.department.description
      } : null,
      createdAt: updatedMenuItem.createdAt,
      updatedAt: updatedMenuItem.updatedAt
    }

    return NextResponse.json(formattedMenuItem)

  } catch (error) {
    console.error('Error assigning menu item to department:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get the menu item with its current department assignment
    const menuItem = await prisma.menuItem.findFirst({
      where: {
        id: params.id,
        userId: restaurantOwnerId
      },
      include: {
        category: true,
        department: true
      }
    })

    if (!menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    // Get all available departments for this restaurant
    const departments = await prisma.department.findMany({
      where: { userId: restaurantOwnerId },
      orderBy: { name: 'asc' }
    })

    // Format response
    const response = {
      menuItem: {
        id: menuItem.id,
        name: menuItem.name,
        description: menuItem.description,
        price: menuItem.price,
        category: {
          id: menuItem.category.id,
          name: menuItem.category.name
        },
        department: menuItem.department ? {
          id: menuItem.department.id,
          name: menuItem.department.name,
          description: menuItem.department.description
        } : null
      },
      availableDepartments: departments.map(dept => ({
        id: dept.id,
        name: dept.name,
        description: dept.description
      }))
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching menu item department info:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

