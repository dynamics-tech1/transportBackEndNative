const Joi = require("joi");

// Account status often uses req.user, so no extensive params might be needed.
// But if there are query params, we can validate them.
exports.accountStatusQuery = Joi.object({
  // No apparent params from route view, possibly empty
}).unknown(true); 
