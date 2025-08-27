import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEFAULT_ROLES = [
  {
    name: 'Admin',
    description: 'Full access to all restaurant management features'
  },
  {
    name: 'Waiter',
    description: 'Can take orders, manage tables, and serve customers'
  },
  {
    name: 'Kitchen',
    description: 'Can view and manage kitchen orders and food preparation'
  },
  {
    name: 'Cafe',
    description: 'Can view and manage cafe orders (drinks, desserts)'
  },
  {
    name: 'WaterStation',
    description: 'Can view and manage water station orders'
  },
  {
    name: 'Cashier',
    description: 'Can process payments and manage billing'
  }
]

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin (owner or has admin role)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true }
    })

    if (!user || (user.isStaff && user.role?.name !== 'Admin')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Check if roles already exist
    const existingRoles = await prisma.role.findMany()
    
    if (existingRoles.length > 0) {
      return NextResponse.json(
        { message: 'Roles already exist', roles: existingRoles },
        { status: 200 }
      )
    }

    // Create default roles
    const createdRoles = await Promise.all(
      DEFAULT_ROLES.map(role =>
        prisma.role.create({
          data: role
        })
      )
    )

    return NextResponse.json(
      { 
        message: 'Default roles created successfully', 
        roles: createdRoles 
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Error seeding roles:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

