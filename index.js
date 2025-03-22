const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const app = express();

app.use(express.json());
app.use(cors({
    credentials: true
}));

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.DB_URI);
        app.listen(3000);
        console.log('Successfully connected to the database!');
        console.log("http://localhost:3000");
    } catch (e) {
        console.log(e.message);
    }
};


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public', 'loginscreen')));
app.use(express.static(path.join(__dirname, 'public', 'adminhub')));


app.get('/dashboard', (req, res) => {
    res.status(200).sendFile(path.join(__dirname, 'public', 'adminhub', 'index.html'));
});

app.get('/login', (req, res) => {
    res.status(200).sendFile(path.join(__dirname, 'public', 'loginscreen', 'index.html'));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === "admin" && password === "password") {
        res.status(200).send({ redirect: "/dashboard" });
    } else {
        res.status(500).send("Invalid credentials");
    }
});


// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Get section information from the form data
        const sectionId = req.body.sectionId || 'main';

        // Create directory if it doesn't exist
        const uploadDir = path.join(__dirname, 'public', 'uploads', sectionId);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const sectionId = req.body.sectionId || 'main';
        const metadataFile = path.join(__dirname, 'public', 'uploads', 'metadata', `${sectionId}-metadata.json`);

        let imageCount = 0;

        if (fs.existsSync(metadataFile)) {
            let jsonFile = fs.readFileSync(metadataFile, 'utf-8');
            let jsonData = JSON.parse(jsonFile);
            imageCount = jsonData.length; // Number of existing images
        }

        // If this is the first file in the request, initialize a counter
        if (!req.imageCounter) {
            req.imageCounter = imageCount + 1;
        }

        // Assign a unique number and increment the counter for the next file
        const currentImageCount = req.imageCounter;
        req.imageCounter++;

        // Generate filename like "image-1.png", "image-2.png", etc.
        cb(null, `image-${currentImageCount}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
    },
    fileFilter: function (req, file, cb) {
        // Accept only image files
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

app.post('/upload-images', upload.array('images', 10), async (req, res) => {
    try {
        const files = req.files;
        const sectionId = req.body.sectionId || 'main';
        const sectionName = req.body.sectionName || 'Website';

        // Extract dimension data
        const dimensions = Array.isArray(req.body.dimension) ? req.body.dimension : [req.body.dimension];

        // Metadata file path
        const metadataDir = path.join(__dirname, 'public', 'uploads', 'metadata');
        const metadataPath = path.join(metadataDir, `${sectionId}-metadata.json`);

        // Ensure metadata directory exists
        if (!fs.existsSync(metadataDir)) {
            fs.mkdirSync(metadataDir, { recursive: true });
        }

        // Load existing metadata (as an object)
        let existingMetadata = {};
        if (fs.existsSync(metadataPath)) {
            try {
                existingMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            } catch (err) {
                console.error('Error reading existing metadata:', err);
                existingMetadata = {};
            }
        }

        // Process and store new images
        files.forEach((file, index) => {
            let width = null;
            let height = null;

            if (dimensions[index]) {
                const [w, h] = dimensions[index].split('x').map(Number);
                width = w;
                height = h;
            }

            // Add new metadata entry using filename as the key
            existingMetadata[path.parse(file.filename).name] = {
                originalname: file.originalname,
                size: formatFileSize(file.size),
                mimetype: file.mimetype,
                section: sectionId,
                location: sectionName,
                width: width,
                height: height,
                uploadDate: new Date().toISOString(),
            };
        });

        // Write updated metadata back to the file
        fs.writeFileSync(metadataPath, JSON.stringify(existingMetadata, null, 2));

        res.status(200).json({
            success: true,
            message: `Successfully uploaded ${files.length} images for ${sectionName}`,
            uploadedCount: files.length,
            images: Object.keys(existingMetadata),
            refreshGrid: true
        });

    } catch (error) {
        console.error('Error uploading images:', error.message);
        res.status(500).json({
            success: false,
            message: `Error uploading images: ${error.message}`
        });
    }
});

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    else return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

connectDB();