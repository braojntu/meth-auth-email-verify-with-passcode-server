const express = require("express");
const cors = require("cors");
require("dotenv").config();
require("./db");
const userRouter = require("./routes/user");

const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("<h1>MERN Auth Server Home Route</h1>");
});

app.use("/api/user", userRouter);

app.listen(PORT, () => {
  console.log("Node Express Server Running on Port: " + PORT);
});
