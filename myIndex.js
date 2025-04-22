const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
require('dotenv').config()
const mongoose = require('mongoose')

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

// use the body parser for post requests
app.use(bodyParser.urlencoded({ extended: true }))

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// define schema and model from mongoose
const { Schema, model } = require('mongoose');
const { type } = require('express/lib/response')

// define a new schema for user
const userSchema = new Schema({
  username: {type: String}
})

// define a new exercise schema
const exerciseSchema = new Schema({
  userId: {type: Schema.Types.ObjectId, ref: 'User', required: true},
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: {type: Date}
})

// define a model for the new user and exercise schema
const User = model('User', userSchema);
const Exercise = model('Exercise', exerciseSchema);

// POST user info
app.post('/api/users', async (req, res) => {
  // get user name
  const username = req.body.username;
  
  try {
    // define the new user from the input and save it
    const newUser = new User({ username });
    const savedUser = await newUser.save();

    // send the json format
    res.json({
      _id: savedUser._id,
      username: username
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save user" })
  }
})

// GET users info
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '_id username');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" })
  }
})

// POST exercise details
app.post('/api/users/:_id/exercises', async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;

  try {
    // find the user by id
    const user = await User.findById(id);

    // if user isn't found
    if (!user) return res.json({ error: "User not found" })

    // if no date is inserted
    const exerciseDate = date ? new Date(date) : new Date();
    
    // create new exercise
    const newExercise = new Exercise({
      userId: user._id,
      description,
      duration: parseInt(duration),
      date: exerciseDate
    });

    // save the new exercise
    await newExercise.save();

    // post new exercise in json format
    res.json({
      _id: user._id,
      username: user.username,
      date: exerciseDate.toDateString(),
      duration: parseInt(duration),
      description
    })

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not post exercises" })
  }
})

// GET list of all logged exercises from a user
app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(userId);
    if (!user) return res.json({ error: 'User not found' });

    const query = { userId };

    if (from || to) {
      query.date = {}
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    let exerciseQuery = Exercise.find(query).select('description duration date');

    if (limit) {
      exerciseQuery = exerciseQuery.limit(parseInt(limit));
    };

    const exercises = await exerciseQuery.exec();

    // Format logs
    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }));

    res.json({
      _id: user._id,
      username: user.username,
      count: log.length,
      log: log
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'could not fetch exercise logs' })
  }
})
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

module.exports = User;
