import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

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

    // Check if user is admin (owner or has admin role)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true }
    })

    if (!user || (user.isStaff && user.role?.name !== 'Admin')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Get restaurant owner ID
    const restaurantOwnerId = user.isStaff ? user.restaurantOwnerId : user.id

    // Get the specific staff member
    const staff = await prisma.user.findFirst({
      where: {
        id: params.id,
        OR: [
          { restaurantOwnerId: restaurantOwnerId },
          { id: restaurantOwnerId } // Include the owner themselves
        ]
      },
      include: {
        role: true
      }
    })

    if (!staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

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

    return NextResponse.json(formattedStaff)

  } catch (error) {
    console.error('Error fetching staff member:', error)
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

    // Get restaurant owner ID
    const restaurantOwnerId = user.isStaff ? user.restaurantOwnerId : user.id

    // Check if staff member exists and belongs to this restaurant
    const existingStaff = await prisma.user.findFirst({
      where: {
        id: params.id,
        OR: [
          { restaurantOwnerId: restaurantOwnerId },
          { id: restaurantOwnerId } // Include the owner themselves
        ]
      }
    })

    if (!existingStaff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {}

    if (email && email.trim().length > 0) {
      // Check if email is already taken by another user
      const emailExists = await prisma.user.findFirst({
        where: {
          email: email.trim().toLowerCase(),
          id: { not: params.id }
        }
      })

      if (emailExists) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 400 }
        )
      }

      updateData.email = email.trim().toLowerCase()
    }

    if (password && password.length >= 6) {
      updateData.password = await bcrypt.hash(password, 12)
    }

    if (ownerName && ownerName.trim().length > 0) {
      updateData.ownerName = ownerName.trim()
    }

    if (roleId) {
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

      updateData.roleId = roleId
    }

    // Update the staff member
    const updatedStaff = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      include: {
        role: true
      }
    })

    // Format response to exclude sensitive data
    const formattedStaff = {
      id: updatedStaff.id,
      email: updatedStaff.email,
      ownerName: updatedStaff.ownerName,
      isStaff: updatedStaff.isStaff,
      role: updatedStaff.role ? {
        id: updatedStaff.role.id,
        name: updatedStaff.role.name,
        description: updatedStaff.role.description
      } : null,
      createdAt: updatedStaff.createdAt,
      updatedAt: updatedStaff.updatedAt
    }

    return NextResponse.json(formattedStaff)

  } catch (error) {
    console.error('Error updating staff member:', error)
    
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get restaurant owner ID
    const restaurantOwnerId = user.isStaff ? user.restaurantOwnerId : user.id

    // Check if staff member exists and belongs to this restaurant
    const existingStaff = await prisma.user.findFirst({
      where: {
        id: params.id,
        OR: [
          { restaurantOwnerId: restaurantOwnerId },
          { id: restaurantOwnerId } // Include the owner themselves
        ]
      }
    })

    if (!existingStaff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // Prevent deletion of the restaurant owner
    if (!existingStaff.isStaff) {
      return NextResponse.json(
        { error: 'Cannot delete the restaurant owner' },
        { status: 400 }
      )
    }

    // Delete the staff member
    await prisma.user.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Staff member deleted successfully' })

  } catch (error) {
    console.error('Error deleting staff member:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

