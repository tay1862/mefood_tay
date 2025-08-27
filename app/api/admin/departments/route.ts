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

    // Get all departments for this restaurant
    const departments = await prisma.department.findMany({
      where: { 
        userId: restaurantOwnerId
      },
      include: {
        _count: {
          select: {
            menuItems: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Format response to include menu item count
    const formattedDepartments = departments.map(dept => ({
      id: dept.id,
      name: dept.name,
      description: dept.description,
      menuItemCount: dept._count.menuItems,
      createdAt: dept.createdAt,
      updatedAt: dept.updatedAt
    }))

    return NextResponse.json(formattedDepartments)

  } catch (error) {
    console.error('Error fetching departments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Department name is required' },
        { status: 400 }
      )
    }

    // Get restaurant owner ID
    const restaurantOwnerId = await getRestaurantOwnerId()
    if (!restaurantOwnerId) {
      return NextResponse.json({ error: 'Restaurant owner not found' }, { status: 404 })
    }

    // Check if department name already exists for this restaurant
    const existingDepartment = await prisma.department.findFirst({
      where: {
        userId: restaurantOwnerId,
        name: name.trim()
      }
    })

    if (existingDepartment) {
      return NextResponse.json(
        { error: 'A department with this name already exists' },
        { status: 400 }
      )
    }

    // Create the department
    const department = await prisma.department.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
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

    // Format response
    const formattedDepartment = {
      id: department.id,
      name: department.name,
      description: department.description,
      menuItemCount: department._count.menuItems,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt
    }

    return NextResponse.json(formattedDepartment, { status: 201 })

  } catch (error) {
    console.error('Error creating department:', error)
    
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

