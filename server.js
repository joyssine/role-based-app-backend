const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'your-very-secure-secret';

app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3000']
}));
app.use(express.json());
app.use(express.static('public'));

// ========================
// IN-MEMORY DATABASE
// ========================
let users = [
  { id: 1, username: 'admin', password: '$2a$10$...', role: 'admin' },
  { id: 2, username: 'alice', password: '$2a$10$...', role: 'user' }
];
if (users[0].password.includes('$2a$')) {
  users[0].password = bcrypt.hashSync('admin123', 10);
  users[1].password = bcrypt.hashSync('user123', 10);
}

let departments = [
  { id: 1, name: 'Engineering', description: 'Software Team' },
  { id: 2, name: 'HR', description: 'Human Resources' }
];

let employees = [];

// ========================
// MIDDLEWARE
// ========================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

function authorizeRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role)
      return res.status(403).json({ error: 'Access denied: insufficient permissions' });
    next();
  };
}

// ========================
// AUTH ROUTES
// ========================
app.post('/api/register', async (req, res) => {
  const { username, password, role = 'user' } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });
  const existing = users.find(u => u.username === username);
  if (existing) return res.status(409).json({ error: 'User already exists' });
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = { id: users.length + 1, username, password: hashedPassword, role };
  users.push(newUser);
  res.status(201).json({ message: 'User registered', username, role });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    SECRET_KEY,
    { expiresIn: '1h' }
  );
  res.json({ token, username: user.username, role: user.role });
});

app.get('/api/profile', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/admin/dashboard', authenticateToken, authorizeRole('admin'), (req, res) => {
  res.json({ message: 'Welcome to admin dashboard!', data: 'Secret admin info' });
});

app.get('/api/user/content', authenticateToken, authorizeRole('user'), (req, res) => {
  res.json({ message: `Welcome, ${req.user.username}! Here is your content.` });
});

// ========================
// DEPARTMENT ROUTES
// ========================
app.get('/api/departments', authenticateToken, (req, res) => {
  res.json(departments);
});

app.post('/api/departments', authenticateToken, authorizeRole('admin'), (req, res) => {
  const { name, description } = req.body;
  if (!name || !description)
    return res.status(400).json({ error: 'Name and description required' });
  const existing = departments.find(d => d.name === name);
  if (existing) return res.status(400).json({ error: 'Department already exists' });
  const newDept = { id: departments.length + 1, name, description };
  departments.push(newDept);
  res.json(newDept);
});

app.put('/api/departments/:id', authenticateToken, authorizeRole('admin'), (req, res) => {
  const dept = departments.find(d => d.id === parseInt(req.params.id));
  if (!dept) return res.status(404).json({ error: 'Department not found' });
  dept.name = req.body.name;
  dept.description = req.body.description;
  res.json(dept);
});

app.delete('/api/departments/:id', authenticateToken, authorizeRole('admin'), (req, res) => {
  const index = departments.findIndex(d => d.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Department not found' });
  departments.splice(index, 1);
  res.json({ message: 'Department deleted' });
});

// ========================
// EMPLOYEE ROUTES
// ========================
app.get('/api/employees', authenticateToken, (req, res) => {
  res.json(employees);
});

app.post('/api/employees', authenticateToken, authorizeRole('admin'), (req, res) => {
  const { id, email, position, dept, hireDate } = req.body;
  if (!id || !email || !position || !dept || !hireDate)
    return res.status(400).json({ error: 'All fields required' });
  const existing = employees.find(e => e.id === id);
  if (existing) return res.status(400).json({ error: 'Employee ID already exists' });
  const newEmp = { id, email, position, dept, hireDate };
  employees.push(newEmp);
  res.json(newEmp);
});

app.put('/api/employees/:id', authenticateToken, authorizeRole('admin'), (req, res) => {
  const emp = employees.find(e => e.id === req.params.id);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });
  emp.email = req.body.email;
  emp.position = req.body.position;
  emp.dept = req.body.dept;
  emp.hireDate = req.body.hireDate;
  res.json(emp);
});

app.delete('/api/employees/:id', authenticateToken, authorizeRole('admin'), (req, res) => {
  const index = employees.findIndex(e => e.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Employee not found' });
  employees.splice(index, 1);
  res.json({ message: 'Employee deleted' });
});

// ========================
// START SERVER
// ========================
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
  console.log(`🔑 Try logging in with:`);
  console.log(` - Admin: username=admin, password=admin123`);
  console.log(` - User:  username=alice, password=user123`);
});
