import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { validateQRSession } from '@/lib/qr-utils'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionToken, songTitle, artist, message } = body

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Session token is required' },
        { status: 400 }
      )
    }

    if (!songTitle || songTitle.trim().length === 0) {
      return NextResponse.json(
        { error: 'Song title is required' },
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

    // Create music request
    const musicRequest = await prisma.musicRequest.create({
      data: {
        qrSessionId: qrSession.id,
        songTitle: songTitle.trim(),
        artist: artist?.trim() || null,
        message: message?.trim() || null,
        status: 'PENDING'
      }
    })

    return NextResponse.json({
      id: musicRequest.id,
      songTitle: musicRequest.songTitle,
      artist: musicRequest.artist,
      message: musicRequest.message,
      status: musicRequest.status,
      createdAt: musicRequest.createdAt
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating music request:', error)
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

    // Get music requests for this session
    const musicRequests = await prisma.musicRequest.findMany({
      where: {
        qrSessionId: qrSession.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(musicRequests)

  } catch (error) {
    console.error('Error fetching music requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

