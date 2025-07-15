const express = require('express');
const cors = require('cors');
require('dotenv').config();

// const productRoutes = require('./routes/productRoutes');
const productRoutes = require('./routes/productRoutes.ts');
// const serviceRoutes = require('./routes/serviceRoutes');
// const orderRoutes = require('./routes/orderRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/products', productRoutes);
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
// app.use('/services', serviceRoutes);
// app.use('/orders', orderRoutes);
// app.use('/users', userRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
