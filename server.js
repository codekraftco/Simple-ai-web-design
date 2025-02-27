const express = require('express');
const multer = require('multer');
const aws = require('aws-sdk');
const mongoose = require('mongoose');
const app = express();

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/obituaries', { useNewUrlParser: true, useUnifiedTopology: true });

// Set up S3
const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Obituary model
const Obituary = mongoose.model('Obituary', new mongoose.Schema({
  name: String,
  dob: String,
  dop: String,
  bio: String,
  photoUrl: String,
  videoUrl: String,
}));

app.use(express.json());

// Upload endpoint
app.post('/upload', upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  const { name, dob, dop, bio } = req.body;
  const photo = req.files.photo[0];
  const video = req.files.video[0];

  // Upload photo to S3
  const photoParams = {
    Bucket: process.env.S3_BUCKET,
    Key: `${Date.now()}_${photo.originalname}`,
    Body: photo.buffer,
    ContentType: photo.mimetype,
  };
  const photoData = await s3.upload(photoParams).promise();

  // Upload video to S3
  const videoParams = {
    Bucket: process.env.S3_BUCKET,
    Key: `${Date.now()}_${video.originalname}`,
    Body: video.buffer,
    ContentType: video.mimetype,
  };
  const videoData = await s3.upload(videoParams).promise();

  // Save obituary to database
  const obituary = new Obituary({
    name,
    dob,
    dop,
    bio,
    photoUrl: photoData.Location,
    videoUrl: videoData.Location,
  });
  await obituary.save();

  res.send({ message: 'Obituary saved successfully' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
