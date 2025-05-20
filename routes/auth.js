const path = require("path");
const express = require("express");
const { check } = require("express-validator");
const User = require("../models/user");

const authController = require("../controllers/auth");

const router = express.Router();

router.get("/login", authController.getLogin);

router.post(
  "/login",
  [
    check("email")
      .isEmail()
      .withMessage("Please enter a valid email.")
      .normalizeEmail(),
    check("password")
      .isLength({ min: 5 })
      .withMessage("Password must be at least 5 characters.")
      .isAlphanumeric()
      .withMessage("Password must contain only letters and numbers.")
      .trim(),
  ],
  authController.postLogin
);

router.post("/logout", authController.postLogout);

router.get("/signup", authController.getSignup);

router.post(
  "/signup",
  [
    check("email")
      .isEmail()
      .withMessage("Please enter a valid email.")
      .custom((value, { req }) => {
        return User.findOne({ email: value }).then((userDoc) => {
          if (userDoc) {
            return Promise.reject(
              "E-mail exists already, please pick a different one or log in using this one."
            );
          }
        });
      })
      .normalizeEmail(),

    check("password")
      .isLength({ min: 5 })
      .withMessage("Password must be at least 5 characters.")
      .isAlphanumeric()
      .withMessage("Password must contain only letters and numbers.")
      .trim(),

    check("confirmPassword")
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error("Passwords need to match!");
        }
        return true;
      })
      .trim(),
  ],
  authController.postSignup
);

router.get("/reset", authController.getReset);

router.post("/reset", authController.postReset);

router.get("/reset/:token", authController.getNewPassword);

router.post(
  "/new-password",
  [
    check("confirmPassword")
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error("Passwords do not match!");
        }
        return true;
      })
      .trim(),
    check("password")
      .isLength({ min: 5 })
      .withMessage("Password must be at least 5 characters.")
      .isAlphanumeric()
      .withMessage("Password must contain only letters and numbers.")
      .trim(),
  ],
  authController.postNewPassword
);

module.exports = router;
