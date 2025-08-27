'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Button,
  Grid,
  Chip,
  IconButton,
  Badge,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material'
import {
  Add,
  Remove,
  ShoppingCart,
  Restaurant,
  TableRestaurant,
  Person,
  Check
} from '@mui/icons-material'

interface MenuItem {
  id: number
  name: string
  description: string
  price: number
  categoryId: number
  categoryName: string
  imageUrl?: string
  available: boolean
  visible: boolean
}

interface CartItem {
  menuItem: MenuItem
  quantity: number
  specialInstructions?: string
}

interface Table {
  id: number
  number: string
  name?: string
  capacity: number
}

interface Restaurant {
  id: number
  name: string
  description?: string
}

export default function CustomerOrderPage() {
  const params = useParams()
  const restaurantId = params.id as string
  const tableId = params.tableId as string

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [table, setTable] = useState<Table | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [guestCount, setGuestCount] = useState(1)
  const [loading, setLoading] = useState(true)
  const [orderSubmitting, setOrderSubmitting] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)

  useEffect(() => {
    loadData()
  }, [restaurantId, tableId])

  const loadData = async () => {
    try {
      // Load restaurant info
      const restaurantRes = await fetch(`/api/restaurant/${restaurantId}`)
      if (restaurantRes.ok) {
        const restaurantData = await restaurantRes.json()
        setRestaurant(restaurantData)
      }

      // Load table info
      const tableRes = await fetch(`/api/restaurant/${restaurantId}/tables/${tableId}`)
      if (tableRes.ok) {
        const tableData = await tableRes.json()
        setTable(tableData)
      }

      // Load menu items
      const menuRes = await fetch(`/api/restaurant/${restaurantId}/menu`)
      if (menuRes.ok) {
        const menuData = await menuRes.json()
        const availableItems = menuData.filter((item: MenuItem) => item.available && item.visible)
        setMenuItems(availableItems)
        
        // Extract unique categories
        const uniqueCategories = [...new Set(availableItems.map((item: MenuItem) => item.categoryName))]
        setCategories(uniqueCategories)
      }
    } catch (error) {
      console.error('Error loading data:', error)
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

  const removeFromCart = (menuItemId: number) => {
    setCart(prevCart => {
      return prevCart.reduce((acc, item) => {
        if (item.menuItem.id === menuItemId) {
          if (item.quantity > 1) {
            acc.push({ ...item, quantity: item.quantity - 1 })
          }
        } else {
          acc.push(item)
        }
        return acc
      }, [] as CartItem[])
    })
  }

  const updateCartItemInstructions = (menuItemId: number, instructions: string) => {
    setCart(prevCart =>
      prevCart.map(item =>
        item.menuItem.id === menuItemId
          ? { ...item, specialInstructions: instructions }
          : item
      )
    )
  }

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.menuItem.price * item.quantity), 0)
  }

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const filteredMenuItems = selectedCategory === 'all'
    ? menuItems
    : menuItems.filter(item => item.categoryName === selectedCategory)

  const submitOrder = async () => {
    if (cart.length === 0 || !customerName.trim()) {
      return
    }

    setOrderSubmitting(true)
    try {
      // Create QR session first
      const sessionRes = await fetch(`/api/restaurant/${restaurantId}/qr-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: parseInt(tableId),
          guestCount
        })
      })

      if (!sessionRes.ok) {
        throw new Error('Failed to create session')
      }

      const sessionData = await sessionRes.json()
      const sessionId = sessionData.sessionId

      // Submit order
      const orderRes = await fetch(`/api/restaurant/${restaurantId}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          items: cart.map(item => ({
            menuItemId: item.menuItem.id,
            quantity: item.quantity,
            specialInstructions: item.specialInstructions || '',
            toppings: []
          })),
          customerName: customerName.trim(),
          notes: `สั่งจากโต๊ะ ${table?.number || tableId}`
        })
      })

      if (!orderRes.ok) {
        throw new Error('Failed to submit order')
      }

      setOrderSuccess(true)
      setCart([])
      setCartOpen(false)
    } catch (error) {
      console.error('Error submitting order:', error)
      alert('เกิดข้อผิดพลาดในการส่งออเดอร์ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setOrderSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    )
  }

  if (orderSuccess) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box textAlign="center">
          <Check sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            ออเดอร์ส่งเรียบร้อยแล้ว!
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={3}>
            ขอบคุณสำหรับการสั่งอาหาร ออเดอร์ของคุณกำลังเตรียม
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              setOrderSuccess(false)
              setCustomerName('')
              setGuestCount(1)
            }}
          >
            สั่งอาหารเพิ่ม
          </Button>
        </Box>
      </Container>
    )
  }

  return (
    <Box sx={{ pb: 10 }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 3 }}>
        <Container maxWidth="md">
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Restaurant />
            <Typography variant="h5" fontWeight="bold">
              {restaurant?.name || 'ร้านอาหาร'}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={2}>
            <TableRestaurant />
            <Typography variant="body1">
              โต๊ะ {table?.number || tableId} {table?.name && `(${table.name})`}
            </Typography>
            <Person />
            <Typography variant="body1">
              {table?.capacity || 4} ที่นั่ง
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 3 }}>
        {/* Category Filter */}
        <Box sx={{ mb: 3, overflowX: 'auto' }}>
          <Box display="flex" gap={1} sx={{ minWidth: 'fit-content' }}>
            <Chip
              label="ทั้งหมด"
              onClick={() => setSelectedCategory('all')}
              color={selectedCategory === 'all' ? 'primary' : 'default'}
              variant={selectedCategory === 'all' ? 'filled' : 'outlined'}
            />
            {categories.map(category => (
              <Chip
                key={category}
                label={category}
                onClick={() => setSelectedCategory(category)}
                color={selectedCategory === category ? 'primary' : 'default'}
                variant={selectedCategory === category ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        </Box>

        {/* Menu Items */}
        <Grid container spacing={2}>
          {filteredMenuItems.map(item => (
            <Grid item xs={12} sm={6} key={item.id}>
              <Card>
                {item.imageUrl && (
                  <CardMedia
                    component="img"
                    height="200"
                    image={item.imageUrl}
                    alt={item.name}
                  />
                )}
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {item.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {item.description}
                  </Typography>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                    <Typography variant="h6" color="primary">
                      ฿{item.price}
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => addToCart(item)}
                    >
                      เพิ่ม
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {filteredMenuItems.length === 0 && (
          <Box textAlign="center" py={4}>
            <Typography variant="body1" color="text.secondary">
              ไม่มีรายการอาหารในหมวดหมู่นี้
            </Typography>
          </Box>
        )}
      </Container>

      {/* Cart FAB */}
      {cart.length > 0 && (
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => setCartOpen(true)}
        >
          <Badge badgeContent={getTotalItems()} color="secondary">
            <ShoppingCart />
          </Badge>
        </Fab>
      )}

      {/* Cart Dialog */}
      <Dialog open={cartOpen} onClose={() => setCartOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ตะกร้าสินค้า</DialogTitle>
        <DialogContent>
          {cart.length === 0 ? (
            <Typography>ตะกร้าว่าง</Typography>
          ) : (
            <>
              <List>
                {cart.map((item, index) => (
                  <div key={`${item.menuItem.id}-${index}`}>
                    <ListItem>
                      <ListItemText
                        primary={item.menuItem.name}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="primary">
                              ฿{item.menuItem.price} x {item.quantity} = ฿{item.menuItem.price * item.quantity}
                            </Typography>
                            <TextField
                              size="small"
                              placeholder="คำสั่งพิเศษ (เช่น ไม่ใส่ผักชี)"
                              value={item.specialInstructions || ''}
                              onChange={(e) => updateCartItemInstructions(item.menuItem.id, e.target.value)}
                              fullWidth
                              sx={{ mt: 1 }}
                            />
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Box display="flex" alignItems="center" gap={1}>
                          <IconButton
                            size="small"
                            onClick={() => removeFromCart(item.menuItem.id)}
                          >
                            <Remove />
                          </IconButton>
                          <Typography>{item.quantity}</Typography>
                          <IconButton
                            size="small"
                            onClick={() => addToCart(item.menuItem)}
                          >
                            <Add />
                          </IconButton>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < cart.length - 1 && <Divider />}
                  </div>
                ))}
              </List>
              
              <Divider sx={{ my: 2 }} />
              
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">รวม:</Typography>
                <Typography variant="h6" color="primary">
                  ฿{getTotalPrice()}
                </Typography>
              </Box>

              <TextField
                label="ชื่อลูกค้า"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                fullWidth
                required
                sx={{ mb: 2 }}
              />

              <TextField
                label="จำนวนผู้ใช้บริการ"
                type="number"
                value={guestCount}
                onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                fullWidth
                inputProps={{ min: 1, max: table?.capacity || 10 }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCartOpen(false)}>ปิด</Button>
          {cart.length > 0 && (
            <Button
              variant="contained"
              onClick={submitOrder}
              disabled={!customerName.trim() || orderSubmitting}
            >
              {orderSubmitting ? <CircularProgress size={20} /> : 'สั่งอาหาร'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
}

