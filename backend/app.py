import os
import torch
import faiss
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from typing import List, Dict, Optional, Any
from PIL import Image
import clip
from pathlib import Path
from tqdm import tqdm
import logging
import json
from datetime import datetime
import random
import threading

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Image Search API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
device = "cuda" if torch.cuda.is_available() else "cpu"
logger.info(f"Using device: {device}")

model, preprocess = clip.load("ViT-B/32", device=device)
logger.info("CLIP model loaded successfully")

index = None
filenames = []
original_paths = []
image_metadata: Dict[str, dict] = {}
user_preferences: Dict[str, dict] = {}
image_embeddings = {}  # Store embeddings for random retrieval
index_lock = threading.Lock()  # Lock for thread-safe index operations

# Load user preferences from file if exists
PREFERENCES_FILE = "user_preferences.json"
if os.path.exists(PREFERENCES_FILE):
    try:
        with open(PREFERENCES_FILE, 'r') as f:
            user_preferences = json.load(f)
        logger.info(f"Loaded preferences for {len(user_preferences)} users")
    except Exception as e:
        logger.error(f"Error loading preferences: {e}")

class SearchQuery(BaseModel):
    text: str
    num_results: int = 15
    wallet_address: Optional[str] = None
    random_seed: Optional[int] = None

    model_config = ConfigDict(arbitrary_types_allowed=True)

class LikeImageRequest(BaseModel):
    wallet_address: str
    image_hash: str

    model_config = ConfigDict(arbitrary_types_allowed=True)

class ImageResult(BaseModel):
    filename: str
    hash: str
    similarity: float
    extension: str

    model_config = ConfigDict(arbitrary_types_allowed=True)

class SearchResponse(BaseModel):
    results: List[ImageResult]
    total: int
    random_seed: Optional[int] = None

    model_config = ConfigDict(arbitrary_types_allowed=True)

def save_preferences():
    try:
        with open(PREFERENCES_FILE, 'w') as f:
            json.dump(user_preferences, f)
        logger.info("Preferences saved successfully")
    except Exception as e:
        logger.error(f"Error saving preferences: {e}")

def get_user_embedding(wallet_address: str) -> Optional[np.ndarray]:
    if wallet_address not in user_preferences:
        return None
    
    user_data = user_preferences[wallet_address]
    if not user_data.get('liked_images'):
        return None
    
    # Get embeddings for all liked images
    liked_embeddings = []
    for image_hash in user_data['liked_images']:
        if image_hash in image_metadata:
            idx = filenames.index(image_hash)
            with torch.no_grad():
                image = preprocess(Image.open(image_metadata[image_hash]['path'])).unsqueeze(0).to(device)
                embedding = model.encode_image(image)
                embedding /= embedding.norm(dim=-1, keepdim=True)
                liked_embeddings.append(embedding.cpu().numpy())
    
    if not liked_embeddings:
        return None
    
    # Average the embeddings
    return np.mean(liked_embeddings, axis=0)

def get_random_embeddings(seed: Optional[int] = None, num_results: int = 15) -> List[ImageResult]:
    if seed is not None:
        random.seed(seed)
    
    # Get random indices
    indices = random.sample(range(len(filenames)), min(num_results, len(filenames)))
    
    results = []
    for idx in indices:
        filename = filenames[idx]
        results.append(ImageResult(
            filename=filename,
            hash=image_metadata[filename]["hash"],
            similarity=random.random(),  # Random similarity score
            extension=image_metadata[filename]["extension"]
        ))
    
    return results

def initialize_index(image_folder: str = "images"):
    global index, filenames, original_paths, image_metadata, image_embeddings
    
    # Create images directory if it doesn't exist
    os.makedirs(image_folder, exist_ok=True)
    
    image_files = []
    for ext in ['*.jpg', '*.jpeg', '*.png']:
        image_files.extend(list(Path(image_folder).glob(ext)))
    
    if not image_files:
        logger.warning(f"No images found in {image_folder}")
        return
    
    logger.info(f"Found {len(image_files)} images to process")
    
    embedding_dim = 512
    
    # Create a CPU-optimized index
    if len(image_files) > 1000:
        # For larger datasets, use IVF index for better performance
        nlist = min(100, len(image_files) // 10)  # Number of clusters
        quantizer = faiss.IndexFlatIP(embedding_dim)
        index = faiss.IndexIVFFlat(quantizer, embedding_dim, nlist, faiss.METRIC_INNER_PRODUCT)
        index.train(np.random.rand(1000, embedding_dim).astype('float32'))  # Train on random vectors
    else:
        # For smaller datasets, use simple flat index
        index = faiss.IndexFlatIP(embedding_dim)
    
    # Process images in batches for better memory management
    batch_size = 32
    for i in tqdm(range(0, len(image_files), batch_size), desc="Processing image batches"):
        batch_files = image_files[i:i + batch_size]
        batch_embeddings = []
        
        with torch.no_grad():
            for img_path in batch_files:
                try:
                    image = preprocess(Image.open(img_path)).unsqueeze(0).to(device)
                    image_features = model.encode_image(image)
                    image_features /= image_features.norm(dim=-1, keepdim=True)
                    features_np = image_features.cpu().numpy()
                    batch_embeddings.append(features_np[0])
                    
                    # Store metadata
                    filename = img_path.stem
                    original_paths.append(img_path)
                    filenames.append(filename)
                    image_metadata[filename] = {
                        "path": str(img_path),
                        "filename": filename,
                        "extension": img_path.suffix,
                        "hash": filename  # Using filename as hash for now
                    }
                    image_embeddings[filename] = features_np[0]
                    
                except Exception as e:
                    logger.error(f"Error processing {img_path}: {e}")
        
        if batch_embeddings:
            # Add batch to index
            batch_array = np.array(batch_embeddings, dtype='float32')
            index.add(batch_array)
    
    logger.info(f"Successfully indexed {len(filenames)} images")

@app.on_event("startup")
async def startup_event():
    try:
        initialize_index()
    except Exception as e:
        logger.error(f"Error initializing index: {e}")
        raise

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "indexed_images": len(filenames) if filenames else 0,
        "device": device,
        "index_type": type(index).__name__ if index else None
    }

@app.post("/search", response_model=SearchResponse)
async def search_images(query: SearchQuery):
    if index is None or not filenames:
        raise HTTPException(
            status_code=500,
            detail="Image index not initialized. Please ensure images are present in the images directory."
        )
    
    try:
        # If no text query and no user embedding, return random results
        if not query.text.strip() and (not query.wallet_address or not get_user_embedding(query.wallet_address)):
            random_seed = query.random_seed if query.random_seed is not None else random.randint(0, 1000000)
            results = get_random_embeddings(random_seed, query.num_results)
            return SearchResponse(
                results=results,
                total=len(results),
                random_seed=random_seed
            )

        with torch.no_grad():
            text_features = model.encode_text(clip.tokenize(query.text).to(device))
            text_features /= text_features.norm(dim=-1, keepdim=True)
            
            # If user has preferences, blend with their embedding
            if query.wallet_address:
                user_embedding = get_user_embedding(query.wallet_address)
                if user_embedding is not None:
                    # Blend text and user embeddings (70% text, 30% user preferences)
                    text_features = 0.7 * text_features + 0.3 * torch.from_numpy(user_embedding).to(device)
                    text_features /= text_features.norm(dim=-1, keepdim=True)
        
        k = min(query.num_results, len(filenames))
        
        # Thread-safe search
        with index_lock:
            if isinstance(index, faiss.IndexIVFFlat):
                # For IVF index, increase nprobe for better accuracy
                index.nprobe = min(10, index.nlist)
            distances, indices = index.search(text_features.cpu().numpy(), k)
        
        results = []
        for idx, distance in zip(indices[0], distances[0]):
            if idx < len(filenames):  # Ensure index is valid
                filename = filenames[idx]
                results.append(ImageResult(
                    filename=filename,
                    hash=image_metadata[filename]["hash"],
                    similarity=float(distance),
                    extension=image_metadata[filename]["extension"]
                ))
        
        return SearchResponse(
            results=results,
            total=len(results)
        )
    
    except Exception as e:
        logger.error(f"Error during search: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/images")
async def list_images():
    return {
        "total": len(filenames),
        "images": [image_metadata[filename] for filename in filenames]
    }

@app.post("/like")
async def like_image(request: LikeImageRequest):
    if request.wallet_address not in user_preferences:
        user_preferences[request.wallet_address] = {
            'liked_images': [],
            'created_at': datetime.now().isoformat()
        }
    
    if request.image_hash not in user_preferences[request.wallet_address]['liked_images']:
        user_preferences[request.wallet_address]['liked_images'].append(request.image_hash)
        save_preferences()
    
    return {"status": "success", "message": "Image liked successfully"}

@app.post("/unlike")
async def unlike_image(request: LikeImageRequest):
    if request.wallet_address in user_preferences:
        if request.image_hash in user_preferences[request.wallet_address]['liked_images']:
            user_preferences[request.wallet_address]['liked_images'].remove(request.image_hash)
            save_preferences()
    
    return {"status": "success", "message": "Image unliked successfully"}

@app.get("/user/{wallet_address}/likes")
async def get_user_likes(wallet_address: str):
    if wallet_address not in user_preferences:
        return {"liked_images": []}
    
    return {
        "liked_images": user_preferences[wallet_address]['liked_images']
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5510)