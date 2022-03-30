const jwt = require("jsonwebtoken");
const {isValidObjectId} = require("mongoose");
const User = require("../models/user");
const VerificationToken = require("../models/verificationToken");
const ResetToken = require("../models/resetToken");
const {sendError, createRandomBytes} = require("../utils/helper");
const {
  generateOTP,
  mailTransport,
  generateEmailTemplate,
  confirmedEmailTemplate,
  passwordResetTemplate,
  passwordResetSuccessTemplate,
} = require("../utils/mail");

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

  const isMatched = await user.comparePassword(password);
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

exports.forgotPassword = async (req, res) => {
  const {email} = req.body;
  if (!email) return sendError(res, "Please provide a valid email!");

  const user = await User.findOne({email});
  if (!user) return sendError(res, "User not found, invalid request!");

  const dbtoken = await ResetToken.findOne({owner: user._id});
  if (dbtoken)
    return sendError(
      res,
      "You can request for new token after expiry of existing token or 1 hour later"
    );

  const randomtoken = await createRandomBytes();
  const resetToken = new ResetToken({owner: user._id, token: randomtoken});
  await resetToken.save();

  mailTransport().sendMail({
    from: "emailreset@email.com",
    to: user.email,
    subject: "Password Reset Mail",
    html: passwordResetTemplate(
      `http://localhost:3000/reset-password?token=${randomtoken}&id=${user._id}`
    ),
  });
  res.json({
    success: true,
    message: "Password reset link sent to your email!",
  });
};

exports.resetPassword = async (req, res) => {
  const {password} = req.body;
  const user = await User.findById(req.user._id);
  if (!user) return sendError(res, "user not found!");

  const isSamePassword = await user.comparePassword(password);
  if (isSamePassword) return sendError(res, "New password must be different!");

  if (password.trim().length < 8 || password.trim().length > 20)
    return sendError(res, "Password must be 8 to 20 characters long");

  user.password = password.trim();
  await user.save();

  await ResetToken.findOneAndDelete({owner: user._id});

  mailTransport().sendMail({
    from: "passwordreset@email.com",
    to: user.email,
    subject: "Password Reset Successfull",
    html: passwordResetSuccessTemplate(
      "Password Reset Was Successfull",
      "Now you can login with new password!"
    ),
  });
  res.json({
    success: true,
    message: "Password reset success email sent!",
  });
};
