import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
  IconButton,
  Tooltip,
} from '@mui/material';
import { MagnifyingGlassIcon, HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { searchImages, listImages, likeImage, unlikeImage, getUserLikes } from '../services/api';

const Home = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [walletAddress, setWalletAddress] = useState(null);
  const [likedImages, setLikedImages] = useState(new Set());
  const [randomSeed, setRandomSeed] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const isLaptop = useMediaQuery(theme.breakpoints.down('lg'));
  const isWideScreen = useMediaQuery('(min-aspect-ratio: 16/9)');
  const navigate = useNavigate();
  const observer = useRef();
  const lastImageRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreImages();
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const loadImages = async () => {
    try {
      setLoading(true);
      setError(null);
      const results = await searchImages('', walletAddress);
      setImages(results);
      setHasMore(results.length > 0);
    } catch (err) {
      setError('Failed to load images');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreImages = async () => {
    if (!hasMore || loading) return;
    
    try {
      setLoading(true);
      const results = await searchImages('', walletAddress);
      if (results.length > 0) {
        setImages(prev => [...prev, ...results]);
        setHasMore(true);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      setError('Failed to load more images');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      loadImages();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const results = await searchImages(searchQuery, walletAddress);
      setImages(results);
      setHasMore(false);
    } catch (err) {
      setError('Search failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (imageHash) => {
    if (!walletAddress) {
      setError('Please connect your wallet to like images');
      return;
    }

    try {
      if (likedImages.has(imageHash)) {
        await unlikeImage(walletAddress, imageHash);
        setLikedImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(imageHash);
          return newSet;
        });
      } else {
        await likeImage(walletAddress, imageHash);
        setLikedImages(prev => new Set([...prev, imageHash]));
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const loadUserLikes = async () => {
    if (!walletAddress) return;
    try {
      const likes = await getUserLikes(walletAddress);
      setLikedImages(new Set(likes));
    } catch (err) {
      console.error('Error loading user likes:', err);
    }
  };

  useEffect(() => {
    loadImages();
  }, []);

  useEffect(() => {
    if (walletAddress) {
      loadUserLikes();
    }
  }, [walletAddress]);

  // Calculate grid columns based on screen size and aspect ratio
  const getGridColumns = () => {
    if (isMobile) return 12;
    if (isTablet) return 6;
    if (isLaptop) return 4;
    if (isWideScreen) return 3;
    return 4;
  };

  // Calculate image height based on screen size and aspect ratio
  const getImageHeight = () => {
    if (isMobile) return 180;
    if (isTablet) return 220;
    if (isLaptop) return 260;
    if (isWideScreen) return 280;
    return 300;
  };

  // Calculate container max width based on screen size
  const getContainerMaxWidth = () => {
    if (isMobile) return 'sm';
    if (isTablet) return 'md';
    if (isLaptop) return 'lg';
    return 'xl';
  };

  if (loading && !images.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      backgroundColor: theme.palette.background.default,
      pt: 2,
      pb: 4
    }}>
      <Container maxWidth={getContainerMaxWidth()}>
        <Box 
          component="form" 
          onSubmit={handleSearch} 
          sx={{ 
            mb: 4, 
            maxWidth: '600px', 
            mx: 'auto',
            position: 'sticky',
            top: { xs: 56, sm: 64 },
            zIndex: 1000,
            backgroundColor: theme.palette.background.default,
            py: { xs: 1, sm: 1.5, md: 2 },
            px: { xs: 1, sm: 1.5, md: 2 },
            borderRadius: 1,
            boxShadow: 1
          }}
        >
          <Grid container spacing={1.5} alignItems="center">
            <Grid item xs>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search images..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size={isMobile ? "small" : "medium"}
                InputProps={{
                  startAdornment: (
                    <Box sx={{ mr: 1, color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
                      <MagnifyingGlassIcon className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                    </Box>
                  )
                }}
              />
            </Grid>
            <Grid item>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
                size={isMobile ? "small" : "medium"}
              >
                Search
              </Button>
            </Grid>
          </Grid>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, maxWidth: '600px', mx: 'auto' }}>
            {error}
          </Alert>
        )}

        <Grid 
          container 
          spacing={{ xs: 1, sm: 1.5, md: 2 }}
          sx={{
            mx: { xs: -0.5, sm: -1, md: -1.5 }
          }}
        >
          {images.map((image, index) => (
            <Grid
              item
              xs={12}
              sm={6}
              md={4}
              lg={getGridColumns()}
              key={image.hash}
              ref={index === images.length - 1 ? lastImageRef : null}
              sx={{
                px: { xs: 0.5, sm: 1, md: 1.5 }
              }}
            >
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.02)',
                    boxShadow: 6,
                    '& .MuiCardMedia-root': {
                      transform: 'scale(1.05)'
                    }
                  }
                }}
              >
                <Box sx={{ position: 'relative', overflow: 'hidden' }}>
                  <CardMedia
                    component="img"
                    height={getImageHeight()}
                    image={image.arweaveUrl}
                    alt={image.filename}
                    loading="lazy"
                    sx={{
                      objectFit: 'cover',
                      backgroundColor: 'grey.900',
                      transition: 'transform 0.3s ease',
                      width: '100%'
                    }}
                  />
                  <Tooltip title={walletAddress ? (likedImages.has(image.hash) ? "Unlike" : "Like") : "Connect wallet to like"}>
                    <IconButton
                      sx={{
                        position: 'absolute',
                        top: { xs: 4, sm: 6, md: 8 },
                        right: { xs: 4, sm: 6, md: 8 },
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.7)'
                        },
                        padding: { xs: 0.5, sm: 0.75, md: 1 }
                      }}
                      onClick={() => handleLike(image.hash)}
                    >
                      {likedImages.has(image.hash) ? (
                        <HeartSolidIcon className={`${isMobile ? 'h-4 w-4' : isTablet ? 'h-5 w-5' : 'h-6 w-6'} text-red-500`} />
                      ) : (
                        <HeartIcon className={`${isMobile ? 'h-4 w-4' : isTablet ? 'h-5 w-5' : 'h-6 w-6'} text-white`} />
                      )}
                    </IconButton>
                  </Tooltip>
                </Box>
                <CardContent sx={{ 
                  flexGrow: 1,
                  p: { xs: 1, sm: 1.5, md: 2 }
                }}>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    noWrap
                    sx={{
                      fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' }
                    }}
                  >
                    {image.filename}
                  </Typography>
                  {image.similarity && (
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        opacity: 0.8,
                        fontSize: '0.875rem'
                      }}
                    >
                      Similarity: {(image.similarity * 100).toFixed(2)}%
                    </Typography>
                  )}
                </CardContent>
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    size="small"
                    color="primary"
                    onClick={() => window.open(image.arweaveUrl, '_blank')}
                    fullWidth
                    sx={{
                      borderRadius: '8px',
                      textTransform: 'none',
                      fontWeight: 600,
                    }}
                  >
                    View Full Size
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {loading && images.length > 0 && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            mt: { xs: 2, sm: 3, md: 4 },
            mb: { xs: 2, sm: 3, md: 4 }
          }}>
            <CircularProgress size={isMobile ? 24 : isTablet ? 28 : 32} />
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default Home; 