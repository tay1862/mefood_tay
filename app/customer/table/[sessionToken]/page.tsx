'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Badge,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  IconButton
} from '@mui/material'
import {
  Restaurant,
  ShoppingCart,
  Call,
  MusicNote,
  Add,
  Remove,
  TableBar,
  Person,
  AccessTime
} from '@mui/icons-material'
import { useCurrency } from '@/lib/currency'

interface QRSession {
  sessionToken: string
  tableNumber: string
  tableName?: string
  restaurantName: string
  customerName?: string
  guestCount: number
  startedAt: string
  isActive: boolean
}

interface MenuItem {
  id: string
  name: string
  description?: string
  price: number
  image?: string
  isAvailable: boolean
  category: {
    id: string
    name: string
  }
  department?: {
    id: string
    name: string
  }
}

interface Category {
  id: string
  name: string
  menuItems: MenuItem[]
}

interface CartItem {
  menuItem: MenuItem
  quantity: number
  notes?: string
}

export default function CustomerOrderingPage({ params }: { params: { sessionToken: string } }) {
  const router = useRouter()
  const { formatCurrency } = useCurrency()
  
  const [session, setSession] = useState<QRSession | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(0)
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  
  // Staff call state
  const [staffCallOpen, setStaffCallOpen] = useState(false)
  const [staffCallType, setStaffCallType] = useState('GENERAL')
  const [staffCallMessage, setStaffCallMessage] = useState('')
  const [staffCallLoading, setStaffCallLoading] = useState(false)
  
  // Music request state
  const [musicRequestOpen, setMusicRequestOpen] = useState(false)
  const [musicSongTitle, setMusicSongTitle] = useState('')
  const [musicArtist, setMusicArtist] = useState('')
  const [musicMessage, setMusicMessage] = useState('')
  const [musicRequestLoading, setMusicRequestLoading] = useState(false)

  useEffect(() => {
    fetchSessionData()
  }, [params.sessionToken])

  const fetchSessionData = async () => {
    try {
      // Validate session
      const sessionResponse = await fetch(`/api/qr/session?token=${params.sessionToken}`)
      if (!sessionResponse.ok) {
        throw new Error('Invalid or expired session')
      }
      const sessionData = await sessionResponse.json()
      setSession(sessionData)

      // Fetch menu
      const menuResponse = await fetch(`/api/restaurant/menu/public?sessionToken=${params.sessionToken}`)
      if (menuResponse.ok) {
        const menuData = await menuResponse.json()
        setCategories(menuData.categories || [])
      }

    } catch (error) {
      console.error('Error fetching session data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load session')
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (menuItem: MenuItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.menuItem.id === menuItem.id)
      if (existingItem) {
        return prevCart.map(item =>
          item.menuItem.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      } else {
        return [...prevCart, { menuItem, quantity: 1 }]
      }
    })
  }

  const removeFromCart = (menuItemId: string) => {
    setCart(prevCart => {
      return prevCart.map(item =>
        item.menuItem.id === menuItemId
          ? { ...item, quantity: Math.max(0, item.quantity - 1) }
          : item
      ).filter(item => item.quantity > 0)
    })
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.menuItem.price * item.quantity), 0)
  }

  const getCartItemCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const handleStaffCall = async () => {
    setStaffCallLoading(true)
    try {
      const response = await fetch('/api/qr/staff-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken: params.sessionToken,
          type: staffCallType,
          message: staffCallMessage.trim() || undefined
        })
      })

      if (!response.ok) {
        throw new Error('Failed to call staff')
      }

      setStaffCallOpen(false)
      setStaffCallMessage('')
      // Show success message
      setError(null)
      
    } catch (error) {
      console.error('Error calling staff:', error)
      setError('Failed to call staff. Please try again.')
    } finally {
      setStaffCallLoading(false)
    }
  }

  const handleMusicRequest = async () => {
    setMusicRequestLoading(true)
    try {
      const response = await fetch('/api/qr/music-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken: params.sessionToken,
          songTitle: musicSongTitle.trim(),
          artist: musicArtist.trim() || undefined,
          message: musicMessage.trim() || undefined
        })
      })

      if (!response.ok) {
        throw new Error('Failed to request music')
      }

      setMusicRequestOpen(false)
      setMusicSongTitle('')
      setMusicArtist('')
      setMusicMessage('')
      // Show success message
      setError(null)
      
    } catch (error) {
      console.error('Error requesting music:', error)
      setError('Failed to request music. Please try again.')
    } finally {
      setMusicRequestLoading(false)
    }
  }

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
        <Typography variant="h6">Loading menu...</Typography>
      </Box>
    )
  }

  if (error || !session) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'Session not found'}
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
    <>
      <Container maxWidth="lg" sx={{ py: 2, pb: 10 }}>
        {/* Header */}
        <Card elevation={2} sx={{ mb: 3, borderRadius: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <TableBar sx={{ color: '#2E5E45' }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {session.restaurantName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Table {session.tableNumber}
                  {session.tableName && ` (${session.tableName})`}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Chip
                  icon={<Person />}
                  label={`${session.guestCount} guests`}
                  size="small"
                  color="primary"
                />
                {session.customerName && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                    {session.customerName}
                  </Typography>
                )}
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Call />}
                onClick={() => setStaffCallOpen(true)}
              >
                Call Staff
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<MusicNote />}
                onClick={() => setMusicRequestOpen(true)}
              >
                Request Music
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Menu Categories */}
        {categories.length > 0 ? (
          <>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ mb: 3 }}
            >
              {categories.map((category, index) => (
                <Tab
                  key={category.id}
                  label={`${category.name} (${category.menuItems.length})`}
                />
              ))}
            </Tabs>

            {/* Menu Items */}
            {categories[activeTab] && (
              <Grid container spacing={2}>
                {categories[activeTab].menuItems.map((item) => (
                  <Grid item xs={12} sm={6} md={4} key={item.id}>
                    <Card
                      elevation={2}
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        opacity: item.isAvailable ? 1 : 0.6
                      }}
                    >
                      {item.image && (
                        <Box
                          sx={{
                            height: 150,
                            backgroundImage: `url(${item.image})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                          }}
                        />
                      )}
                      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          {item.name}
                        </Typography>
                        {item.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flex: 1 }}>
                            {item.description}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="h6" sx={{ color: '#2E5E45', fontWeight: 600 }}>
                            {formatCurrency(item.price)}
                          </Typography>
                          {item.isAvailable ? (
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => addToCart(item)}
                              sx={{
                                background: 'linear-gradient(135deg, #A3DC9A 0%, #2E5E45 100%)'
                              }}
                            >
                              Add
                            </Button>
                          ) : (
                            <Chip label="Unavailable" size="small" color="default" />
                          )}
                        </Box>
                        {item.department && (
                          <Chip
                            label={item.department.name}
                            size="small"
                            sx={{ mt: 1, alignSelf: 'flex-start' }}
                          />
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        ) : (
          <Alert severity="info">
            Menu is currently unavailable. Please call staff for assistance.
          </Alert>
        )}
      </Container>

      {/* Floating Cart Button */}
      {getCartItemCount() > 0 && (
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            background: 'linear-gradient(135deg, #A3DC9A 0%, #2E5E45 100%)'
          }}
          onClick={() => setCartOpen(true)}
        >
          <Badge badgeContent={getCartItemCount()} color="error">
            <ShoppingCart />
          </Badge>
        </Fab>
      )}

      {/* Cart Dialog */}
      <Dialog open={cartOpen} onClose={() => setCartOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Your Order</DialogTitle>
        <DialogContent>
          {cart.map((item) => (
            <Box
              key={item.menuItem.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 2,
                borderBottom: '1px solid #eee'
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1">{item.menuItem.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatCurrency(item.menuItem.price)} each
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton
                  size="small"
                  onClick={() => removeFromCart(item.menuItem.id)}
                >
                  <Remove />
                </IconButton>
                <Typography sx={{ minWidth: 30, textAlign: 'center' }}>
                  {item.quantity}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => addToCart(item.menuItem)}
                >
                  <Add />
                </IconButton>
              </Box>
              <Typography variant="subtitle1" sx={{ minWidth: 80, textAlign: 'right' }}>
                {formatCurrency(item.menuItem.price * item.quantity)}
              </Typography>
            </Box>
          ))}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2, fontWeight: 600 }}>
            <Typography variant="h6">Total:</Typography>
            <Typography variant="h6" sx={{ color: '#2E5E45' }}>
              {formatCurrency(getCartTotal())}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCartOpen(false)}>Continue Shopping</Button>
          <Button
            variant="contained"
            disabled={cart.length === 0}
            sx={{
              background: 'linear-gradient(135deg, #A3DC9A 0%, #2E5E45 100%)'
            }}
          >
            Place Order
          </Button>
        </DialogActions>
      </Dialog>

      {/* Staff Call Dialog */}
      <Dialog open={staffCallOpen} onClose={() => setStaffCallOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Call Staff</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Request Type</InputLabel>
              <Select
                value={staffCallType}
                onChange={(e) => setStaffCallType(e.target.value)}
                label="Request Type"
              >
                <MenuItem value="GENERAL">General Assistance</MenuItem>
                <MenuItem value="WATER">Request Water</MenuItem>
                <MenuItem value="BILL">Request Bill</MenuItem>
                <MenuItem value="COMPLAINT">Complaint/Issue</MenuItem>
                <MenuItem value="ASSISTANCE">Help with Order</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Message (Optional)"
              value={staffCallMessage}
              onChange={(e) => setStaffCallMessage(e.target.value)}
              multiline
              rows={3}
              fullWidth
              placeholder="Any additional details..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStaffCallOpen(false)}>Cancel</Button>
          <Button
            onClick={handleStaffCall}
            variant="contained"
            disabled={staffCallLoading}
            startIcon={staffCallLoading ? <CircularProgress size={20} /> : <Call />}
          >
            {staffCallLoading ? 'Calling...' : 'Call Staff'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Music Request Dialog */}
      <Dialog open={musicRequestOpen} onClose={() => setMusicRequestOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Music</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Song Title"
              value={musicSongTitle}
              onChange={(e) => setMusicSongTitle(e.target.value)}
              required
              fullWidth
              placeholder="Enter song title"
            />
            <TextField
              label="Artist (Optional)"
              value={musicArtist}
              onChange={(e) => setMusicArtist(e.target.value)}
              fullWidth
              placeholder="Enter artist name"
            />
            <TextField
              label="Message (Optional)"
              value={musicMessage}
              onChange={(e) => setMusicMessage(e.target.value)}
              multiline
              rows={2}
              fullWidth
              placeholder="Any special request or dedication..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMusicRequestOpen(false)}>Cancel</Button>
          <Button
            onClick={handleMusicRequest}
            variant="contained"
            disabled={musicRequestLoading || !musicSongTitle.trim()}
            startIcon={musicRequestLoading ? <CircularProgress size={20} /> : <MusicNote />}
          >
            {musicRequestLoading ? 'Requesting...' : 'Request Music'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

