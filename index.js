const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI, () => {
  console.log("connected to mongodb");
});

const userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      unique: true,
    },
  },
  {
    versionKey: false,
  }
);

const User = mongoose.model("User", userSchema);

const exerciseSchema = mongoose.Schema(
  {
    username: String,
    description: String,
    duration: Number,
    date: Date,
    userId: String,
  },
  {
    versionKey: false,
  }
);

const Exercise = mongoose.model("Exercise", exerciseSchema);

app.use(cors());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/api/users", async (req, res) => {
  const users = await User.find();

  res.json(users);
});

app.post("/api/users", async (req, res) => {
  const username = req.body.username;
  const foundUser = await User.findOne({ username });

  if (foundUser) {
    res.json(foundUser);
  }

  const user = await User.create({
    username,
  });

  res.json(user);
});

app.post("/api/users/:id/exercises", async (req, res) => {
  let { description, duration, date } = req.body;
  const userId = req.body[":_id"];

  if (!date) {
    date = new Date();
  } else {
    date = new Date(date);
  }

  const foundUser = await User.findById(userId);

  if (!foundUser) {
    return res.json({ message: "No user exists for that id" });
  }

  if (!Exercise.findOne({ userId })) {
    await Exercise.create({
      username: foundUser.username,
      description,
      duration,
      date,
      userId,
    });
  }

  res.send({
    username: foundUser.username,
    description,
    duration: Number(duration),
    date: date.toDateString(),
    _id: userId,
  });
});

app.get("/api/users/:id/logs", async (req, res) => {
  let { from, to, limit } = req.query;

  const userId = req.params.id;
  const foundUser = await User.findById(userId);

  if (!foundUser) {
    return res.json({ message: "No user exists for that id" });
  }

  let filter = { userId };
  let dataFilter = [];
  if (from) {
    dataFilter["$gte"] = new Date(from);
  }
  if (to) {
    dataFilter["$lte"] = new Date(to);
  }

  if (from || to) {
    filter.date = dataFilter;
  }

  if (!limit) limit = 100;

  const exercises = await Exercise.find(filter).limit(limit);

  res.send({
    username: foundUser.username,
    count: exercises.length,
    _id: userId,
    log: exercises.map((exe) => ({
      description: exe.description,
      duration: exe.duration,
      date: exe.date.toDateString(),
    })),
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
