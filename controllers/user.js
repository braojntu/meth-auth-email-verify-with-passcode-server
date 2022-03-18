const User = require("../models/user");

exports.createUser = async (req, res) => {
  const {name, email, password} = req.body;

  const user = await User.find({email});
  if (user)
    res.status(400).json({success: false, error: "This email already exists!"});
  console.log(user);

  const newUser = new User({
    name: name,
    email: email,
    password: password,
  });
  await newUser.save();
  //res.send(newUser);
};
