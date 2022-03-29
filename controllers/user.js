const User = require("../models/user");
const VerificationToken = require("../models/verificationToken");
const {sendError} = require("../utils/helper");
const jwt = require("jsonwebtoken");
const {
  generateOTP,
  mailTransport,
  generateEmailTemplate,
  confirmedEmailTemplate,
} = require("../utils/mail");
const {isValidObjectId} = require("mongoose");

exports.createUser = async (req, res) => {
  const {name, email, password} = req.body;
  const user = await User.findOne({email});
  // console.log("Request Body: " + "\n" + name + " " + email + " " + password);
  // console.log("user from DB: " + user);

  if (user) return sendError(res, "This email already exists!");

  const newUser = new User({
    name,
    email,
    password,
  });

  const OTP = generateOTP();
  const vToken = new VerificationToken({
    owner: newUser._id,
    token: OTP,
  });

  await vToken.save();
  await newUser.save();

  mailTransport().sendMail({
    from: "emailverification@email.com",
    to: newUser.email,
    subject: "Verify your email account",
    html: generateEmailTemplate(OTP),
  });

  res.send(newUser);
};

exports.signin = async (req, res) => {
  const {email, password} = req.body;
  if (!email.trim() || !password.trim())
    return sendError(res, "Email/Password missing!");

  const user = await User.findOne({email});
  if (!user) return sendError(res, "User not found!");

  const isMatched = user.comparePassword(password);
  if (!isMatched) return sendError(res, "Email/Password does not match!");

  const token = jwt.sign({userId: user._id}, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
  res.json({
    success: true,
    user: {name: user.name, email: user.email, id: user._id, token: token},
  });
};

exports.verifyEmail = async (req, res) => {
  const {userId, otp} = req.body;
  if (!userId || !otp.trim())
    return sendError(res, "Invalid request, missing parameters!");

  if (!isValidObjectId(userId)) return sendError(res, "Invalid user id!");
  const user = await User.findById(userId);
  if (!user) return sendError(res, "Sorry, user not found!");

  if (user.verified) return sendError(res, "This account is already verified!");

  const token = await VerificationToken.findOne({owner: user._id});
  if (!token) return sendError(res, "Sorry, user not found!");

  const isMatched = await token.compareToken(otp);
  if (!isMatched) return sendError(res, "Please provided a valid token!");

  user.verified = true;
  await VerificationToken.findByIdAndDelete(token._id);
  await user.save();

  mailTransport().sendMail({
    from: "emailverification@email.com",
    to: user.email,
    subject: "Email Verification Confirmation",
    html: confirmedEmailTemplate(
      "Email Verified Successfully",
      "Thanks for connecting with us!"
    ),
  });
  res.json({
    success: true,
    message: "your email is verified!",
    user: {name: user.name, email: user.email, id: user._id},
  });
};
