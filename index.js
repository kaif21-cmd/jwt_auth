
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const port = process.env.PORT || 8005;

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));

mongoose.connect("mongodb://127.0.0.1:27017/form", { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connection to MongoDB successful"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

const db = mongoose.connection;
db.on('error', () => console.error("Error connecting to the database"));
db.once('open', () => console.log("Connected to the database"));

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  token: String // Add token field to store JWT token
});

const User = mongoose.model('User', userSchema);

function generateToken(user) {
  const payload = {
    username: user.username,
    email: user.email,
  };

  return jwt.sign(payload, 'hello', { expiresIn: '1h' });
}

function verifyToken(req, res, next) {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(403).send("No token provided");
  }

  jwt.verify(token, 'hello', (err, decoded) => {
    if (err) {
      return res.status(401).send("Failed to authenticate token");
    }

    req.user = decoded;
    next();
  });
}

app.post("/form", (req, res) => {
  const { username, email, password } = req.body;

  const newUser = new User({
    username: username,
    email: email,
    password: password,
  });

  newUser.save()
    .then(() => {
      console.log("User saved successfully");
      return res.redirect('login.html');
    })
    .catch((err) => {
      console.error("Error saving user:", err);
      return res.status(500).send("Error saving user");
    });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email, password }).exec();

    if (user) {
      const token = generateToken(user);
      
      // Save the token to the database
      user.token = token;
      await user.save();

      return res.redirect('/frontend/index.html');
    } else {
      return res.status(401).send("Invalid email or password");
    }
  } catch (err) {
    console.error("Error during login:", err);
    return res.status(500).send("Error during login");
  }
});

app.get("/", (req, res) => {
  res.send("Hello from Kaif");
  return res.redirect('hsk.html');
});

app.post("/protected-route", verifyToken, (req, res) => {
  // This route is protected, only accessible with a valid token
  res.json({ message: "Protected route accessed successfully" });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
