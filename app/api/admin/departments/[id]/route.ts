import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { canAccessAdmin, getRestaurantOwnerId } from '@/lib/auth-utils'

const prisma = new PrismaClient()

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

    // Get the specific department
    const department = await prisma.department.findFirst({
      where: {
        id: params.id,
        userId: restaurantOwnerId
      },
      include: {
        _count: {
          select: {
            menuItems: true
          }
        }
      }
    })

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    // Format response
    const formattedDepartment = {
      id: department.id,
      name: department.name,
      description: department.description,
      menuItemCount: department._count.menuItems,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt
    }

    return NextResponse.json(formattedDepartment)

  } catch (error) {
    console.error('Error fetching department:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
    const { name, description } = body

    // Get restaurant owner ID
    const restaurantOwnerId = await getRestaurantOwnerId()
    if (!restaurantOwnerId) {
      return NextResponse.json({ error: 'Restaurant owner not found' }, { status: 404 })
    }

    // Check if department exists and belongs to this restaurant
    const existingDepartment = await prisma.department.findFirst({
      where: {
        id: params.id,
        userId: restaurantOwnerId
      }
    })

    if (!existingDepartment) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {}

    if (name && name.trim().length > 0) {
      // Check if name is already taken by another department
      const nameExists = await prisma.department.findFirst({
        where: {
          userId: restaurantOwnerId,
          name: name.trim(),
          id: { not: params.id }
        }
      })

      if (nameExists) {
        return NextResponse.json(
          { error: 'A department with this name already exists' },
          { status: 400 }
        )
      }

      updateData.name = name.trim()
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null
    }

    // Update the department
    const updatedDepartment = await prisma.department.update({
      where: { id: params.id },
      data: updateData,
      include: {
        _count: {
          select: {
            menuItems: true
          }
        }
      }
    })

    // Format response
    const formattedDepartment = {
      id: updatedDepartment.id,
      name: updatedDepartment.name,
      description: updatedDepartment.description,
      menuItemCount: updatedDepartment._count.menuItems,
      createdAt: updatedDepartment.createdAt,
      updatedAt: updatedDepartment.updatedAt
    }

    return NextResponse.json(formattedDepartment)

  } catch (error) {
    console.error('Error updating department:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'A department with this name already exists' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Check if department exists and belongs to this restaurant
    const existingDepartment = await prisma.department.findFirst({
      where: {
        id: params.id,
        userId: restaurantOwnerId
      },
      include: {
        _count: {
          select: {
            menuItems: true
          }
        }
      }
    })

    if (!existingDepartment) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    // Check if department has menu items assigned
    if (existingDepartment._count.menuItems > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete department. ${existingDepartment._count.menuItems} menu items are assigned to this department. Please reassign them first.` 
        },
        { status: 400 }
      )
    }

    // Delete the department
    await prisma.department.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Department deleted successfully' })

  } catch (error) {
    console.error('Error deleting department:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

