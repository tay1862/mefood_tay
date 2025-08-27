import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionToken = searchParams.get('sessionToken')

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Session token is required' },
        { status: 400 }
      )
    }

    // Get session to find restaurant
    const qrSession = await prisma.qRSession.findUnique({
      where: { sessionToken },
      include: {
        table: {
          include: {
            user: true
          }
        }
      }
    })

    if (!qrSession || !qrSession.isActive) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 404 }
      )
    }

    const userId = qrSession.table.userId

    // Get active categories with active menu items
    const categories = await prisma.category.findMany({
      where: {
        userId,
        isActive: true
      },
      include: {
        menuItems: {
          where: {
            isActive: true
          },
          include: {
            department: true
          },
          orderBy: {
            sortOrder: 'asc'
          }
        }
      },
      orderBy: {
        sortOrder: 'asc'
      }
    })

    // Filter out categories with no active menu items
    const categoriesWithItems = categories.filter(category => category.menuItems.length > 0)

    // Format response
    const formattedCategories = categoriesWithItems.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      menuItems: category.menuItems.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: parseFloat(item.price.toString()),
        image: item.image,
        isAvailable: item.isAvailable,
        category: {
          id: category.id,
          name: category.name
        },
        department: item.department ? {
          id: item.department.id,
          name: item.department.name
        } : null
      }))
    }))

    return NextResponse.json({
      restaurantName: qrSession.table.user.restaurantName,
      categories: formattedCategories
    })

  } catch (error) {
    console.error('Error fetching public menu:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

