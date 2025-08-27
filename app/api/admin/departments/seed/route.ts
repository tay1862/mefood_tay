import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { canAccessAdmin, getRestaurantOwnerId } from '@/lib/auth-utils'

const prisma = new PrismaClient()

const DEFAULT_DEPARTMENTS = [
  {
    name: 'Kitchen',
    description: 'Main kitchen for cooking hot meals and main dishes'
  },
  {
    name: 'Cafe',
    description: 'Coffee bar and dessert station for drinks and sweets'
  },
  {
    name: 'Water Station',
    description: 'Beverage station for water, soft drinks, and cold beverages'
  }
]

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

    // Get restaurant owner ID
    const restaurantOwnerId = await getRestaurantOwnerId()
    if (!restaurantOwnerId) {
      return NextResponse.json({ error: 'Restaurant owner not found' }, { status: 404 })
    }

    // Check if departments already exist for this restaurant
    const existingDepartments = await prisma.department.findMany({
      where: { userId: restaurantOwnerId }
    })
    
    if (existingDepartments.length > 0) {
      return NextResponse.json(
        { 
          message: 'Departments already exist for this restaurant', 
          departments: existingDepartments.map(dept => ({
            id: dept.id,
            name: dept.name,
            description: dept.description,
            createdAt: dept.createdAt,
            updatedAt: dept.updatedAt
          }))
        },
        { status: 200 }
      )
    }

    // Create default departments
    const createdDepartments = await Promise.all(
      DEFAULT_DEPARTMENTS.map(dept =>
        prisma.department.create({
          data: {
            ...dept,
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
      )
    )

    // Format response
    const formattedDepartments = createdDepartments.map(dept => ({
      id: dept.id,
      name: dept.name,
      description: dept.description,
      menuItemCount: dept._count.menuItems,
      createdAt: dept.createdAt,
      updatedAt: dept.updatedAt
    }))

    return NextResponse.json(
      { 
        message: 'Default departments created successfully', 
        departments: formattedDepartments 
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Error seeding departments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

