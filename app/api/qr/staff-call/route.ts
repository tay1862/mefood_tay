import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { validateQRSession } from '@/lib/qr-utils'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionToken, type, message } = body

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Session token is required' },
        { status: 400 }
      )
    }

    // Validate session
    const qrSession = await validateQRSession(sessionToken)
    if (!qrSession) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 404 }
      )
    }

    // Create staff call
    const staffCall = await prisma.staffCall.create({
      data: {
        qrSessionId: qrSession.id,
        type: type || 'GENERAL',
        message: message?.trim() || null,
        status: 'PENDING'
      }
    })

    return NextResponse.json({
      id: staffCall.id,
      type: staffCall.type,
      message: staffCall.message,
      status: staffCall.status,
      createdAt: staffCall.createdAt
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating staff call:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    // Validate session
    const qrSession = await validateQRSession(sessionToken)
    if (!qrSession) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 404 }
      )
    }

    // Get staff calls for this session
    const staffCalls = await prisma.staffCall.findMany({
      where: {
        qrSessionId: qrSession.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(staffCalls)

  } catch (error) {
    console.error('Error fetching staff calls:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

