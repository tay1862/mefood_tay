import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
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

    // Get all roles
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(roles)

  } catch (error) {
    console.error('Error fetching roles:', error)
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

    // Check if user is admin (owner or has admin role)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true }
    })

    if (!user || (user.isStaff && user.role?.name !== 'Admin')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description } = body

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Role name is required' },
        { status: 400 }
      )
    }

    // Check if role name already exists
    const existingRole = await prisma.role.findUnique({
      where: { name: name.trim() }
    })

    if (existingRole) {
      return NextResponse.json(
        { error: 'A role with this name already exists' },
        { status: 400 }
      )
    }

    // Create the role
    const role = await prisma.role.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null
      }
    })

    return NextResponse.json(role, { status: 201 })

  } catch (error) {
    console.error('Error creating role:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'A role with this name already exists' },
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

