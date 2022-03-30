const {isValidObjectId} = require("mongoose");
const User = require("../models/user");
const ResetToken = require("../models/resetToken");
const {sendError} = require("../utils/helper");

exports.isResetTokenValid = async (req, res, next) => {
  const {token, id} = req.query;
  if (!token || !id) return sendError(res, "Invalid Request");

  if (!isValidObjectId(id)) return sendError(res, "Invalid User!");

  const user = await User.findById(id);
  if (!user) return sendError(res, "User not found!");

  const dbToken = await ResetToken.findOne({owner: user._id});
  if (!dbToken) return sendError(res, "Reset token not found!");

  const isValid = await dbToken.compareToken(token);
  if (!isValid) return sendError(res, "Reset token is invalid!");

  req.user = user;
  next();
};
