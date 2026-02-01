const express = require("express");
const router = express.Router();
const ratingsController = require("../Controllers/Ratings.controller");
const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");

// Create a new rating
const { validator } = require("../Middleware/Validator");
const {
  createRating,
  updateRating,
  ratingParams,
  getRatingsQuery,
} = require("../Validations/Ratings.schema");

// Create a new rating
router.post(
  "/api/ratings",
  verifyTokenOfAxios,
  validator(createRating),
  ratingsController.createRating,
);

// Get all ratings with pagination and filtering
router.get(
  "/api/ratings",
  verifyTokenOfAxios,
  validator(getRatingsQuery, "query"),
  ratingsController.getAllRatings,
);

// Update a specific rating by ID
router.put(
  "/api/ratings/:id",
  verifyTokenOfAxios,
  validator(ratingParams, "params"),
  validator(updateRating),
  ratingsController.updateRating,
);

// Delete a specific rating by ID
router.delete(
  "/api/ratings/:id",
  verifyTokenOfAxios,
  validator(ratingParams, "params"),
  ratingsController.deleteRating,
);

module.exports = router;
