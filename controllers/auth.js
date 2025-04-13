const User = require("../models/user");
const nodemailer = require("nodemailer");
require("dotenv").config();

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { validationResult } = require("express-validator");

const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.getLogin = (req, res, next) => {
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: req.flash("error"),
    input: { email: "", password: "" },
  });
};

exports.getSignup = (req, res, next) => {
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Sign Up",
    errorMessage: req.flash("error"),
    input: { email: "", password: "", confirmPassword: "" },
  });
};

exports.postSignup = async (req, res, next) => {
  const { email, password, confirmPassword } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Sign Up",
      errorMessage: errors.array()[0].msg,
      input: {
        email,
        password,
        confirmPassword,
      },
    });
  }

  if (!email || !password || !confirmPassword) {
    req.flash("error", "All fields are required");
    return res.redirect("/signup");
  }
  const hashedPassword = await bcrypt.hash(password, 12);
  const user = new User({
    email,
    password: hashedPassword,
    cart: { items: [] },
  });

  await user.save();

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Your App" <no-reply@example.com>',
      to: email,
      subject: "Sign Up Successful",
      html: `
          <h1>Welcome to our shop!</h1>
          <p>Your account has been successfully created.</p>
          <p>Email: ${email}</p>
        `,
    });
    console.log(`Welcome email sent to ${email}`);
  } catch (emailError) {
    console.error("Failed to send welcome email:", emailError);
  }
  req.flash("success", "Registration successful! Please log in.");
  res.redirect("/login");
};

exports.postLogin = (req, res, next) => {
  const { email, password } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: errors.array()[0].msg,
      input: { email, password },
    });
  }

  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        req.flash("error", "Invalid email or password");
        return res.status(422).render("auth/login", {
          path: "/login",
          pageTitle: "Login",
          errorMessage: "Invalid email or password",
          input: { email, password },
        });
      }

      return bcrypt.compare(password, user.password).then((doMatch) => {
        if (doMatch) {
          req.session.isLoggedIn = true;
          req.session.user = user;
          return req.session.save((err) => {
            console.log(err);
            res.redirect("/");
          });
        }

        req.flash("error", "Invalid email or password");
        return res.status(422).render("auth/login", {
          path: "/login",
          pageTitle: "Login",
          errorMessage: "Invalid email or password",
          input: { email, password },
        });
      });
    })
    .catch((err) => {
      console.log(err);
      res.redirect("/login");
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};

exports.getReset = (req, res, next) => {
  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Password",
    errorMessage: req.flash("error"),
    input: { password: "", confirmPassword: "" },
  });
};

exports.postReset = (req, res, next) => {
  const errors = validationResult(req);

  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect("/reset");
    }
    const token = buffer.toString("hex");
    User.findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash("error", "No account with that email found.");
          const error = new Error("No account with that email found.");
          error.redirect = "/reset";
          throw error;
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save();
      })
      .then((result) => {
        return transporter
          .sendMail({
            from: process.env.EMAIL_FROM || '"Your App" <no-reply@example.com>',
            to: req.body.email,
            subject: "Sign Up Successful",
            html: `
          <h1>Password Reset Request</h1>
          <p>We have received your request to restart your passwordç</p>
          <p>Click on the <a href="http://localhost:3000/reset/${token}">link</a> here to restart your password</p>
          <p>This link is set to expire in 1 hour</p>
        `,
          })
          .then(() => {
            res.redirect("/");
          });
      })
      .catch((err) => {
        console.log(err);
        req.flash("error", "An error occured. Please try again.");
        res.redirect("/");
      });
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({
    resetToken: token,
    resetTokenExpiration: { $gt: Date.now() },
  })
    .then((user) => {
      if (!user) {
        req.flash("error", "Invalid or expired password reset token");
        return res.redirect("/reset");
      }
      res.render("auth/new-password", {
        path: "/new-password",
        pageTitle: "New Password",
        errorMessage: req.flash("error"),
        userId: user._id.toString(),
        passwordToken: token,
        input: { password: "", confirmPassword: "" },
      });
    })
    .catch((err) => console.log(err));
};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  const confirmedPassword = req.body.confirmPassword;
  let resetUser;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render("auth/new-password", {
      path: "/new-password",
      pageTitle: "New Password",
      errorMessage: errors.array()[0].msg,
      userId: userId,
      passwordToken: passwordToken,
      input: { newPassword: newPassword, confirmedPassword: confirmedPassword },
    });
  }

  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId,
  })
    .then((user) => {
      if (!user) {
        req.flash("error", "Invalid or expired token.");
        return res.redirect("/reset");
      }
      resetUser = user;
      return bcrypt.hash(newPassword, 12);
    })
    .then((hashedPassword) => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save();
    })
    .then((result) => {
      res.redirect("/login");
    })
    .catch((err) => {
      console.log(err);
      next(err);
    });
};
