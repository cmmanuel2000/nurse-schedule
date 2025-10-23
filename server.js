const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = 3000;

// --- Middleware ---
app.use(cors()); 
app.use(express.json()); 
app.use(express.static('public')); 

// --- Database Connection ---
mongoose.connect('mongodb://localhost:27017/nurseDB', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected successfully.'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// --- API Routes ---
// This is the line that was causing the error (line 20)
app.use('/api', apiRoutes); 

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});