import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

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

    // Get restaurant owner ID (if current user is staff, get their owner; if owner, use their ID)
    const restaurantOwnerId = user.isStaff ? user.restaurantOwnerId : user.id

    // Get all staff members for this restaurant
    const staff = await prisma.user.findMany({
      where: {
        OR: [
          { restaurantOwnerId: restaurantOwnerId },
          { id: restaurantOwnerId } // Include the owner themselves
        ]
      },
      include: {
        role: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Format response to exclude sensitive data
    const formattedStaff = staff.map(member => ({
      id: member.id,
      email: member.email,
      ownerName: member.ownerName,
      isStaff: member.isStaff,
      role: member.role ? {
        id: member.role.id,
        name: member.role.name,
        description: member.role.description
      } : null,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt
    }))

    return NextResponse.json(formattedStaff)

  } catch (error) {
    console.error('Error fetching staff:', error)
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
    const { email, password, ownerName, roleId } = body

    // Validate required fields
    if (!email || email.trim().length === 0) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    if (!ownerName || ownerName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    if (!roleId) {
      return NextResponse.json(
        { error: 'Role is required' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      )
    }

    // Verify role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId }
    })

    if (!role) {
      return NextResponse.json(
        { error: 'Invalid role selected' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Get restaurant owner ID
    const restaurantOwnerId = user.isStaff ? user.restaurantOwnerId : user.id

    // Create the staff member
    const staff = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        ownerName: ownerName.trim(),
        roleId: roleId,
        isStaff: true,
        restaurantOwnerId: restaurantOwnerId
      },
      include: {
        role: true
      }
    })

    // Format response to exclude sensitive data
    const formattedStaff = {
      id: staff.id,
      email: staff.email,
      ownerName: staff.ownerName,
      isStaff: staff.isStaff,
      role: staff.role ? {
        id: staff.role.id,
        name: staff.role.name,
        description: staff.role.description
      } : null,
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt
    }

    return NextResponse.json(formattedStaff, { status: 201 })

  } catch (error) {
    console.error('Error creating staff:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
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

