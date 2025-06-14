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
  Fade,
} from '@mui/material';
import { MagnifyingGlassIcon, HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { searchImages, listImages, likeImage, unlikeImage, getUserLikes } from '../services/api';
import { useWallet } from '../contexts/WalletContext';

const Home = () => {
  const { walletAddress } = useWallet();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
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
      const results = await searchImages('', walletAddress, randomSeed);
      setImages(results);
      setHasMore(results.length > 0);
      if (results.length > 0 && results[0].random_seed) {
        setRandomSeed(results[0].random_seed);
      }
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
      const results = await searchImages('', walletAddress, randomSeed);
      if (results.length > 0) {
        setImages(prev => [...prev, ...results]);
        setHasMore(true);
        if (results[0].random_seed) {
          setRandomSeed(results[0].random_seed);
        }
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
      setRandomSeed(null);
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
      setError('Failed to update like status');
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

        <Grid container spacing={2}>
          {images.map((image, index) => (
            <Grid 
              item 
              xs={getGridColumns()} 
              key={image.hash}
              ref={index === images.length - 1 ? lastImageRef : null}
            >
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    transition: 'transform 0.2s ease-in-out',
                    '& .like-button': {
                      opacity: 1,
                    }
                  }
                }}
              >
                <CardMedia
                  component="img"
                  height={getImageHeight()}
                  image={image.arweaveUrl}
                  alt={image.filename}
                  loading="lazy"
                  sx={{
                    objectFit: 'cover',
                    cursor: 'pointer'
                  }}
                  onClick={() => navigate(`/image/${image.hash}`)}
                />
                <Fade in={true}>
                  <IconButton
                    className="like-button"
                    onClick={() => handleLike(image.hash)}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      color: likedImages.has(image.hash) ? '#ff4081' : 'white',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        transform: 'scale(1.1)',
                      },
                      transition: 'all 0.2s ease-in-out',
                      opacity: likedImages.has(image.hash) ? 1 : 0.8,
                      width: { xs: 36, sm: 40 },
                      height: { xs: 36, sm: 40 },
                    }}
                  >
                    {likedImages.has(image.hash) ? (
                      <HeartSolidIcon className="h-6 w-6" />
                    ) : (
                      <HeartIcon className="h-6 w-6" />
                    )}
                  </IconButton>
                </Fade>
              </Card>
            </Grid>
          ))}
          {loading && (
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Grid>
          )}
        </Grid>
      </Container>
    </Box>
  );
};

export default Home; 