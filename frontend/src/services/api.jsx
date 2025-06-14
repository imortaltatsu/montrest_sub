import axios from 'axios';

const API_BASE_URL = 'https://mon.adityaberry.me';

export const getArweaveUrl = (hash) => `https://arnode.asia/${hash}`;

export const checkHealth = async () => {
  const response = await axios.get(`${API_BASE_URL}/health`);
  return response.data;
};

export const searchImages = async (query, walletAddress = null, randomSeed = null) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/search`, {
      text: query,
      wallet_address: walletAddress,
      random_seed: randomSeed
    });
    return response.data.results.map(result => ({
      ...result,
      arweaveUrl: getArweaveUrl(result.hash)
    }));
  } catch (error) {
    console.error('Error searching images:', error);
    throw error;
  }
};

export const listImages = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/images`);
    return response.data.images.map(image => ({
      ...image,
      arweaveUrl: getArweaveUrl(image.hash)
    }));
  } catch (error) {
    console.error('Error listing images:', error);
    throw error;
  }
};

export const likeImage = async (walletAddress, imageHash) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/like`, {
      wallet_address: walletAddress,
      image_hash: imageHash
    });
    return response.data;
  } catch (error) {
    console.error('Error liking image:', error);
    throw error;
  }
};

export const unlikeImage = async (walletAddress, imageHash) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/unlike`, {
      wallet_address: walletAddress,
      image_hash: imageHash
    });
    return response.data;
  } catch (error) {
    console.error('Error unliking image:', error);
    throw error;
  }
};

export const getUserLikes = async (walletAddress) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/user/${walletAddress}/likes`);
    return response.data.liked_images;
  } catch (error) {
    console.error('Error getting user likes:', error);
    throw error;
  }
};

export default axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
}); 