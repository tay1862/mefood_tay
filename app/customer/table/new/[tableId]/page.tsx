'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel
} from '@mui/material'
import {
  Restaurant,
  TableBar,
  People,
  QrCode
} from '@mui/icons-material'

interface TableInfo {
  id: string
  number: string
  name?: string
  capacity: number
  restaurantName: string
}

export default function NewQRSessionPage({ params }: { params: { tableId: string } }) {
  const router = useRouter()
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  
  // Form data
  const [customerName, setCustomerName] = useState('')
  const [guestCount, setGuestCount] = useState(1)

  useEffect(() => {
    fetchTableInfo()
  }, [params.tableId])

  const fetchTableInfo = async () => {
    try {
      const response = await fetch(`/api/restaurant/tables/${params.tableId}`)
      if (!response.ok) {
        throw new Error('Table not found')
      }
      const data = await response.json()
      setTableInfo(data)
    } catch (error) {
      console.error('Error fetching table info:', error)
      setError('Table not found or unavailable')
    } finally {
      setLoading(false)
    }
  }

  const createSession = async () => {
    setCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/qr/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tableId: params.tableId,
          customerName: customerName.trim() || undefined,
          guestCount
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create session')
      }

      const sessionData = await response.json()
      
      // Redirect to customer ordering interface
      router.push(`/customer/table/${sessionData.sessionToken}`)

    } catch (error) {
      console.error('Error creating session:', error)
      setError(error instanceof Error ? error.message : 'Failed to create session')
    } finally {
      setCreating(false)
    }
  }

  const steps = ['Scan QR Code', 'Enter Details', 'Start Ordering']

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          gap: 2
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="h6">Loading table information...</Typography>
      </Box>
    )
  }

  if (error && !tableInfo) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          onClick={() => router.push('/')}
          fullWidth
        >
          Go to Home
        </Button>
      </Container>
    )
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <QrCode sx={{ fontSize: 48, color: '#2E5E45', mb: 2 }} />
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#2E5E45', mb: 1 }}>
          Welcome to {tableInfo?.restaurantName}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          You're about to order from Table {tableInfo?.number}
          {tableInfo?.name && ` (${tableInfo.name})`}
        </Typography>
      </Box>

      {/* Progress Stepper */}
      <Stepper activeStep={step} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Main Card */}
      <Card elevation={4} sx={{ borderRadius: 4 }}>
        <CardContent sx={{ p: 4 }}>
          {/* Table Information */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <TableBar sx={{ color: '#2E5E45' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Table {tableInfo?.number}
              </Typography>
              {tableInfo?.name && (
                <Typography variant="body2" color="text.secondary">
                  {tableInfo.name}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Form */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Your Name (Optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              fullWidth
              placeholder="Enter your name for personalized service"
              helperText="This helps our staff provide better service"
            />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <People sx={{ fontSize: 20 }} />
                Number of Guests
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((count) => (
                  <Button
                    key={count}
                    variant={guestCount === count ? 'contained' : 'outlined'}
                    onClick={() => setGuestCount(count)}
                    sx={{
                      minWidth: 40,
                      height: 40,
                      ...(guestCount === count && {
                        background: 'linear-gradient(135deg, #A3DC9A 0%, #2E5E45 100%)'
                      })
                    }}
                  >
                    {count}
                  </Button>
                ))}
              </Box>
              {guestCount > (tableInfo?.capacity || 4) && (
                <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
                  This table is recommended for {tableInfo?.capacity} guests. 
                  You may need to request additional seating.
                </Typography>
              )}
            </Box>

            <Button
              variant="contained"
              size="large"
              onClick={createSession}
              disabled={creating}
              startIcon={creating ? <CircularProgress size={20} /> : <Restaurant />}
              sx={{
                background: 'linear-gradient(135deg, #A3DC9A 0%, #2E5E45 100%)',
                color: 'white',
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                '&:hover': {
                  background: 'linear-gradient(135deg, #2E5E45 0%, #1a3326 100%)'
                },
                '&:disabled': {
                  background: 'rgba(0, 0, 0, 0.12)'
                }
              }}
            >
              {creating ? 'Starting Session...' : 'Start Ordering'}
            </Button>
          </Box>

          {/* Info */}
          <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(46, 94, 69, 0.05)', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              After starting your session, you'll be able to browse the menu, place orders, 
              call staff for assistance, and request music.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  )
}

