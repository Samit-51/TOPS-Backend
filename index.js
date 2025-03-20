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
    destination: function(req, file, cb) {
        // Get section information from the form data
        const sectionId = req.body.sectionId || 'main';
        
        // Create directory if it doesn't exist
        const uploadDir = path.join(__dirname, 'public', 'uploads', sectionId);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        // Create a unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Create the multer upload instance
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
    },
    fileFilter: function(req, file, cb) {
        // Accept only image files
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

app.post('/upload-images', upload.array('images', 10), async (req, res) => {
    try {
        // Get the uploaded files
        const files = req.files;
        
        // Extract section information
        const sectionId = req.body.sectionId || 'main';
        const sectionName = req.body.sectionName || 'Website';
        
        console.log(`Received ${files.length} images for section: ${sectionName}`);
        
        // Process each file (e.g., save metadata to database)
        const processedImages = files.map(file => {
            // Here you would typically save to a database
            return {
                filename: file.filename,
                path: file.path,
                size: formatFileSize(file.size),
                mimetype: file.mimetype,
                section: sectionId,
                location: sectionName,
                uploadDate: new Date()
            };
        });
        
        // Respond with success
        res.status(200).json({
            success: true,
            message: `Successfully uploaded ${files.length} images for ${sectionName}`,
            uploadedCount: files.length,
            images: processedImages,
            refreshGrid: true
        });
        
    } catch (error) {
        console.error('Error uploading images:', error);
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