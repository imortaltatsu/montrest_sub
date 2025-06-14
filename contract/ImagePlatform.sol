// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract ImagePlatform is ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    Counters.Counter private _profileIds;

    // Structs
    struct Profile {
        uint256 profileId;
        address owner;
        string username;
        string profileImage;
        uint256[] likedImages;
        uint256[] createdImages;
        uint256 totalLikes;
        uint256 totalDonations;
    }

    struct Image {
        uint256 tokenId;
        address creator;
        string imageURI;
        uint256 likes;
        uint256 donations;
        bool isActive;
        mapping(address => bool) hasLiked;
        mapping(address => uint256) userDonations;
    }

    // Mappings
    mapping(uint256 => Profile) public profiles;
    mapping(address => uint256) public addressToProfileId;
    mapping(uint256 => Image) public images;
    mapping(string => bool) public usernames;

    // Events
    event ProfileCreated(uint256 indexed profileId, address indexed owner, string username);
    event ImageCreated(uint256 indexed tokenId, address indexed creator, string imageURI);
    event ImageLiked(uint256 indexed tokenId, address indexed liker);
    event ImageUnliked(uint256 indexed tokenId, address indexed unliker);
    event DonationMade(uint256 indexed tokenId, address indexed donor, uint256 amount);
    event ImageDeactivated(uint256 indexed tokenId, address indexed deactivator);

    // Constants
    uint256 public constant MIN_DONATION = 0.001 ether;
    uint256 public constant PLATFORM_FEE = 5; // 5% platform fee

    constructor() ERC721("ImagePlatform", "IMG") Ownable(msg.sender) {}

    // Profile Functions
    function createProfile(string memory _username, string memory _profileImage) external {
        require(bytes(_username).length > 0, "Username cannot be empty");
        require(!usernames[_username], "Username already taken");
        require(addressToProfileId[msg.sender] == 0, "Profile already exists");

        _profileIds.increment();
        uint256 newProfileId = _profileIds.current();

        profiles[newProfileId] = Profile({
            profileId: newProfileId,
            owner: msg.sender,
            username: _username,
            profileImage: _profileImage,
            likedImages: new uint256[](0),
            createdImages: new uint256[](0),
            totalLikes: 0,
            totalDonations: 0
        });

        addressToProfileId[msg.sender] = newProfileId;
        usernames[_username] = true;

        emit ProfileCreated(newProfileId, msg.sender, _username);
    }

    // Image Functions
    function createImage(string memory _imageURI) external nonReentrant {
        require(addressToProfileId[msg.sender] != 0, "Profile required");
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, _imageURI);

        Image storage newImage = images[newTokenId];
        newImage.tokenId = newTokenId;
        newImage.creator = msg.sender;
        newImage.imageURI = _imageURI;
        newImage.likes = 0;
        newImage.donations = 0;
        newImage.isActive = true;

        uint256 profileId = addressToProfileId[msg.sender];
        profiles[profileId].createdImages.push(newTokenId);

        emit ImageCreated(newTokenId, msg.sender, _imageURI);
    }

    function deactivateImage(uint256 _tokenId) external {
        try this.ownerOf(_tokenId) returns (address owner) {
            require(owner == msg.sender, "Not the image owner");
            require(images[_tokenId].isActive, "Image already deactivated");

            images[_tokenId].isActive = false;
            emit ImageDeactivated(_tokenId, msg.sender);
        } catch {
            revert("Image does not exist");
        }
    }

    function likeImage(uint256 _tokenId) external {
        require(addressToProfileId[msg.sender] != 0, "Profile required");
        try this.ownerOf(_tokenId) returns (address) {
            require(images[_tokenId].isActive, "Image is not active");
            require(!images[_tokenId].hasLiked[msg.sender], "Already liked");

            images[_tokenId].hasLiked[msg.sender] = true;
            images[_tokenId].likes += 1;

            uint256 profileId = addressToProfileId[msg.sender];
            profiles[profileId].likedImages.push(_tokenId);
            profiles[profileId].totalLikes += 1;

            emit ImageLiked(_tokenId, msg.sender);
        } catch {
            revert("Image does not exist");
        }
    }

    function unlikeImage(uint256 _tokenId) external {
        require(addressToProfileId[msg.sender] != 0, "Profile required");
        try this.ownerOf(_tokenId) returns (address) {
            require(images[_tokenId].isActive, "Image is not active");
            require(images[_tokenId].hasLiked[msg.sender], "Not liked yet");

            images[_tokenId].hasLiked[msg.sender] = false;
            images[_tokenId].likes -= 1;

            uint256 profileId = addressToProfileId[msg.sender];
            // Remove from liked images array
            uint256[] storage likedImages = profiles[profileId].likedImages;
            for (uint256 i = 0; i < likedImages.length; i++) {
                if (likedImages[i] == _tokenId) {
                    likedImages[i] = likedImages[likedImages.length - 1];
                    likedImages.pop();
                    break;
                }
            }
            profiles[profileId].totalLikes -= 1;

            emit ImageUnliked(_tokenId, msg.sender);
        } catch {
            revert("Image does not exist");
        }
    }

    function donateToImage(uint256 _tokenId) external payable nonReentrant {
        require(msg.value >= MIN_DONATION, "Donation too small");
        try this.ownerOf(_tokenId) returns (address) {
            require(images[_tokenId].isActive, "Image is not active");

            address creator = images[_tokenId].creator;
            uint256 platformFeeAmount = (msg.value * PLATFORM_FEE) / 100;
            uint256 creatorAmount = msg.value - platformFeeAmount;

            images[_tokenId].donations += msg.value;
            images[_tokenId].userDonations[msg.sender] += msg.value;

            uint256 profileId = addressToProfileId[creator];
            profiles[profileId].totalDonations += msg.value;

            (bool platformSuccess, ) = owner().call{value: platformFeeAmount}("");
            require(platformSuccess, "Platform fee transfer failed");

            (bool creatorSuccess, ) = creator.call{value: creatorAmount}("");
            require(creatorSuccess, "Creator transfer failed");

            emit DonationMade(_tokenId, msg.sender, msg.value);
        } catch {
            revert("Image does not exist");
        }
    }

    // View Functions
    function getProfile(uint256 _profileId) external view returns (
        uint256 profileId,
        address owner,
        string memory username,
        string memory profileImage,
        uint256 totalLikes,
        uint256 totalDonations,
        uint256[] memory likedImages,
        uint256[] memory createdImages
    ) {
        Profile storage profile = profiles[_profileId];
        return (
            profile.profileId,
            profile.owner,
            profile.username,
            profile.profileImage,
            profile.totalLikes,
            profile.totalDonations,
            profile.likedImages,
            profile.createdImages
        );
    }

    function getImage(uint256 _tokenId) external view returns (
        uint256 tokenId,
        address creator,
        string memory imageURI,
        uint256 likes,
        uint256 donations,
        bool isActive
    ) {
        try this.ownerOf(_tokenId) returns (address) {
            Image storage image = images[_tokenId];
            return (
                image.tokenId,
                image.creator,
                image.imageURI,
                image.likes,
                image.donations,
                image.isActive
            );
        } catch {
            revert("Image does not exist");
        }
    }

    function getUserDonation(uint256 _tokenId, address _user) external view returns (uint256) {
        try this.ownerOf(_tokenId) returns (address) {
            return images[_tokenId].userDonations[_user];
        } catch {
            revert("Image does not exist");
        }
    }

    function hasUserLiked(uint256 _tokenId, address _user) external view returns (bool) {
        try this.ownerOf(_tokenId) returns (address) {
            return images[_tokenId].hasLiked[_user];
        } catch {
            revert("Image does not exist");
        }
    }
} 