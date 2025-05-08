const Product = require("../models/product");

const fileHelper = require("../util/file");

const { validationResult } = require("express-validator");

exports.getAddProduct = (req, res, next) => {
  console.log("== GET /admin/products ==");
  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: [],
  });
};

exports.postAddProduct = (req, res, next) => {
  console.log("== POST /add-product reached ==");

  const title = req.body.title;
  const image = req.file;
  const price = parseFloat(req.body.price);
  const description = req.body.description;

  console.log("Uploaded file:", image);

  if (!image) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/edit-product",
      editing: false,
      hasError: true,
      product: { title: title, price: price, description: description },
      errorMessage: "Attached file is not an image",
      validationErrors: [],
    });
  }

  if (!req.user) {
    console.error("❌ req.user is undefined");
    return res.status(500).send("req.user missing");
  }

  const imageUrl = image.path.replace(/\\/g, "/");

  console.log("✅ Preparing to save product with values:");
  console.log({ title, price, description, imageUrl, userId: req.user._id });

  const product = new Product({
    title,
    price,
    description,
    imageUrl,
    userId: req.user._id,
  });

  product
    .save()
    .then((result) => {
      console.log("✅ Product saved. Redirecting...");
      res.redirect("/admin/products");
    })
    .catch((err) => {
      console.error("❌ Error saving product to MongoDB:", err.message);
      if (err.errors) {
        for (const key in err.errors) {
          console.error(
            `Validation error on '${key}':`,
            err.errors[key].message
          );
        }
      }
      res.status(500).redirect("/500");
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect("/");
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return res.redirect("/");
      }
      res.render("admin/edit-product", {
        pageTitle: "Edit Product",
        path: "/admin/edit-product",
        editing: editMode,
        product: product,
        hasError: false,
        errorMessage: null,
        validationErrors: [],
      });
    })
    .catch((err) => console.log(err));
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = parseFloat(req.body.price);
  const image = req.file;
  const updatedDesc = req.body.description;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Edit Product",
      path: "/admin/edit-product",
      editing: true,
      hasError: true,
      product: {
        _id: prodId,
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array,
    });
  }

  console.log("Editing product:", {
    prodId,
    userId: req.user ? req.user._id : "undefined",
  });

  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        console.error("❌ Product not found");
        return res.redirect("/");
      }
      if (product.userId.toString() !== req.user._id.toString()) {
        return res.redirect("/");
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      if (image) {
        product.imageUrl = image.path.replace(/\\/g, "/");
        fileHelper.deleteFile(product.imageUrl);
      }

      console.log("✅ Saving edited product:", {
        _id: product._id,
        title: product.title,
        price: product.price,
        imageUrl: product.imageUrl,
        userId: product.userId,
      });
      return product.save().then((result) => {
        console.log("UPDATED PRODUCT!");
        res.redirect("/admin/products");
      });
    })
    .catch((err) => console.log(err));
};

exports.getProducts = (req, res, next) => {
  Product.find({ userId: req.user._id })

    // .select('title price -_id')
    // .populate('userId', 'name')
    .then((products) => {
      console.log(products);
      res.render("admin/products", {
        prods: products,
        pageTitle: "Admin Products",
        path: "/admin/products",
      });
    })
    .catch((err) => console.log(err));
};

exports.postDeleteProduct = (req, res, next) => {
  console.log("Received productId:", req.body.productId);
  const prodId = req.body.productId;
  Product.findById(prodId).then((product) => {
    if (!product) {
      return next(new Error("Product not found."));
    }
    fileHelper.deleteFile(product.imageUrl);
    Product.deleteOne({ _id: prodId, userId: req.user._id })
      .then(() => {
        console.log("DESTROYED PRODUCT");
        res.json({ success: true });
      })
      .catch((err) => console.log(err));
  });
};
