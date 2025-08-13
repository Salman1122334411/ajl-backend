const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'PUT']
  }
});

app.use(cors());
app.use(express.json());

// MySQL connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'tripgo',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// REST API endpoints
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  const { name, email, password, phone, registrationDate } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, phone, registrationDate) VALUES (?, ?, ?, ?, ?)',
      [name, email, password, phone, registrationDate]
    );
    const [userRows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    const user = userRows[0];
    io.emit('userCreated', user); // Real-time event
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/bookings', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM bookings');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  const { name, email, phone, travelers, specialRequests, tourTitle, totalPrice, tripDate, address, lat, lng } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO bookings (name, email, phone, travelers, specialRequests, tourTitle, totalPrice, tripDate, address, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, phone, travelers, specialRequests, tourTitle, totalPrice, tripDate, address, lat, lng]
    );
    const [bookingRows] = await pool.query('SELECT * FROM bookings WHERE id = ?', [result.insertId]);
    const booking = bookingRows[0];
    io.emit('bookingCreated', booking); // Real-time event
    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: update booking status
app.put('/api/bookings/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await pool.query('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
    const [bookingRows] = await pool.query('SELECT * FROM bookings WHERE id = ?', [id]);
    const booking = bookingRows[0];
    io.emit('bookingUpdated', booking); // Real-time event
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a trip
app.post('/api/trips', async (req, res) => {
  const { name, price } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO trips (name, price) VALUES (?, ?)',
      [name, price]
    );
    const [tripRows] = await pool.query('SELECT * FROM trips WHERE id = ?', [result.insertId]);
    const trip = tripRows[0];
    io.emit('tripCreated', trip); // Real-time event
    res.status(201).json(trip);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a trip
app.delete('/api/trips/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM trips WHERE id = ?', [id]);
    io.emit('tripDeleted', id); // Real-time event
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete user by ID
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    io.emit('userDeleted', id); // Real-time event
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete booking/order by ID
app.delete('/api/bookings/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM bookings WHERE id = ?', [id]);
    io.emit('bookingDeleted', id); // Real-time event
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
