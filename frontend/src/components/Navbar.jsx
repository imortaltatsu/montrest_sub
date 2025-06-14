import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Alert,
  Snackbar
} from '@mui/material';
import { WalletIcon } from '@heroicons/react/24/outline';
import { useWallet } from '../contexts/WalletContext';

const Navbar = () => {
  const { walletAddress, connectWallet, disconnectWallet } = useWallet();
  const [anchorEl, setAnchorEl] = useState(null);
  const [error, setError] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDisconnectWallet = () => {
    disconnectWallet();
    setAnchorEl(null);
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{ 
          backgroundColor: 'rgba(18, 18, 18, 0.8)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
          <Typography
            variant={isMobile ? "h6" : "h5"}
            component={RouterLink}
            to="/"
            sx={{ 
              flexGrow: 1,
              fontWeight: 700,
              background: 'linear-gradient(45deg, #3f51b5 30%, #f50057 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textDecoration: 'none',
              '&:hover': {
                opacity: 0.9
              }
            }}
          >
            montrest
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              component={RouterLink}
              to="/"
              sx={{
                color: 'white',
                textTransform: 'none',
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
            >
              Home
            </Button>
            {!walletAddress ? (
              <Button
                variant="contained"
                onClick={handleConnectWallet}
                startIcon={<WalletIcon className="h-5 w-5" />}
                sx={{
                  px: { xs: 1.5, sm: 2 },
                  py: { xs: 0.75, sm: 1 },
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                }}
              >
                Connect Wallet
              </Button>
            ) : (
              <Box>
                <Button
                  onClick={handleMenu}
                  sx={{
                    color: 'white',
                    textTransform: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  <Avatar
                    sx={{
                      width: { xs: 24, sm: 32 },
                      height: { xs: 24, sm: 32 },
                      bgcolor: 'primary.main'
                    }}
                  >
                    {walletAddress.slice(2, 4)}
                  </Avatar>
                  <Typography
                    variant="body2"
                    sx={{
                      display: { xs: 'none', sm: 'block' },
                      maxWidth: 120,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </Typography>
                </Button>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                  PaperProps={{
                    sx: {
                      mt: 1,
                      backgroundColor: 'background.paper',
                      borderRadius: 2
                    }
                  }}
                >
                  <MenuItem onClick={handleDisconnectWallet}>Disconnect</MenuItem>
                </Menu>
              </Box>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Navbar; 