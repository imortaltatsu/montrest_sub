# montrest

A Pinterest-like doomscrolling social-fi platform built on Monad blockchain. The platform uses CLIP-based image embeddings for semantic search and recommendations, with data primarily stored on-chain.

## Features

- 🔍 AI-powered image search using CLIP embeddings
- 💾 Decentralized storage on Monad blockchain
- 💰 Creator donations and rewards
- ♥️ Like system with on-chain counters
- 🔄 Endless scroll feed
- 🎯 Personalized recommendations
- 🔐 Seamless Web3 authentication with Privy

## Tech Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- Privy for Web3 authentication and wallet management
- Web3.js/Ethers.js for blockchain integration
- Infinite scroll implementation

### Backend
- FastAPI (Python)
- CLIP for image embeddings
- FAISS for vector database
- Monad blockchain for data storage and smart contracts

## Architecture

### Authentication and Wallet Management
- Privy integration for seamless Web3 authentication
- Social login options (Google, Twitter, Discord)
- Wallet connection and management
- Session persistence
- User profile management

### Image Processing and Search
- Image upload and processing pipeline
- CLIP-based embedding generation
- FAISS vector database for efficient similarity search
- Batch processing capability

### Blockchain Integration
- Monad smart contracts for:
  - Image metadata storage
  - Like counter implementation
  - Donation system
  - Creator rewards
  - User profiles and preferences

### User Interface
- Endless doomscrolling feed
- Image upload interface
- Search interface
- Donation interface
- User profile and liked images

## Technical Details

### AI/ML Components
- CLIP model for image and text embeddings
- FAISS for efficient vector similarity search
- User-based recommendation system using liked images
- Average embedding computation for recommendations

### Performance Targets
- Image processing time < 5 seconds
- Search response time < 1 second
- Infinite scroll performance optimization
- Monad blockchain transaction optimization

### Security
- Secure image upload
- Monad blockchain transaction security
- API authentication
- Rate limiting

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.8+
- Monad blockchain access
- GPU for CLIP model (recommended)
- Privy API key

### Installation

1. Clone the repository
```bash
git clone https://github.com/imortaltatsu/montrest_sub.git
```

2. Install frontend dependencies
```bash
cd frontend
npm install
```

3. Install backend dependencies
```bash
cd backend
pip install -r requirements.txt


5. Start development servers
```bash
# Frontend
npm run dev

# Backend
uvicorn main:app --reload
```

## Development

### Project Structure
```
├── frontend/           # React + Vite application
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── contexts/  # Privy context
│   │   └── pages/
├── backend/           # FastAPI application
│   ├── api/          # API endpoints
│   ├── models/       # CLIP and FAISS models
│   └── contracts/    # Monad smart contracts
└── docs/             # Documentation
```

### Key Components

#### Frontend
- Privy authentication and wallet management
- Image upload and processing
- Infinite scroll implementation
- Blockchain wallet integration
- Search interface

#### Backend
- CLIP model integration
- FAISS vector database
- Monad blockchain integration
- API endpoints

#### Smart Contracts
- Image metadata storage
- Like counter
- Donation system
- Creator rewards

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
