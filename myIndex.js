const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { Schema } = mongoose;
require('dotenv').config();

const MONGO_URL = process.env.MONGO_URL;
mongoose.connect(MONGO_URL);
// User schema
const userSchema = new Schema({
  username: String
});
// Exercise schema
const exerciseSchema = new Schema({
  user_id: { 
    type: String,
    required: true },
  description: String,
  duration: Number,
  date: Date,
})

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// GET request to /api/users to get a list of all users.
app.get('/api/users', async function(req, res) {
  const users = await User.find({}).select("_id username");
  if(!users) {
    res.json("User not found")
  } else {
    res.json(users)
  }
})

// POST /api/users will be an object with username and _id properties.
app.post('/api/users', async function(req, res) {
  const users = new User({
    username: req.body.username
  })
  try{
    const user = await users.save()
    res.json(user)
  } catch(err) {
    console.log(err)
  }
})
// POST /api/users/:_id/exercises will be the user object with the exercise fields added
app.post('/api/users/:_id/exercises', async function(req, res) {
  const id = req.params._id;
  const { description, duration, date } = req.body;
  try{
    const user = await User.findById(id);
    if(!user) {
      res.send("No data")
    } else {
      const exercises = new Exercise({
        user_id: user._id,
        description,
        duration,
        date: date ? new Date(date) : new Date()
      });
      const exercise = await exercises.save();
      res.json({
        _id: user._id,
        username: user.username,
        description: exercise.description,
        duration: exercise.duration,
        date: new Date(exercise.date).toDateString()
      })
    }
    
  } catch(err) {
    console.log(err)
  }
})

// GET exercises from all users
app.get('/api/users/:_id/logs', async function(req, res) {
  const { from, to, limit } = req.query;
  const id = req.params._id;
  const user = await User.findById(id);
  if(!user) {
    res.send("User not found");
    return;
  }
  let dateObj = {};
  if(from) {
    dateObj["$gte"] = new Date(from)
  }
  if(to){
    dateObj["$lte"] = new Date(to)
  }
  let filter = {
    user_id: id
  }
  if(from || to) {
    filter.date = dateObj;
  }
  const exercises = await Exercise.find(filter).limit(+limit ?? 500);
  const log = exercises.map(e => ({
    description: e.description,
    duration: e.duration,
    date: e.date.toDateString()
  }));
  res.json({
    username: user.username,
    count: exercises.length,
    _id: user._id,
    log
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
