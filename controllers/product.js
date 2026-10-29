import { Product } from "../models/product.js";

export const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock } = req.body;
    if (
      !name ||
      !description ||
      price === undefined ||
      !category ||
      stock === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide the required information",
      });
    }

    if (
      !Number.isFinite(Number(price)) ||
      Number(price) < 0 ||
      !Number.isInteger(Number(stock)) ||
      Number(stock) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Price and stock must be valid non-negative numbers",
      });
    }

    const isExistProduct = await Product.findOne({ name });
    if (isExistProduct) {
      return res.status(409).json({
        success: false,
        message: "Product already exist!",
      });
    }

    const product = await Product.create({
      name,
      description,
      price: Number(price),
      stock: Number(stock),
      category,
    });
    console.log(product);

    return res.status(201).json({
      success: true,
      message: "Product created successfully.",
      product,
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getProducts = async (req, res) => {
  try {
    const products = await Product.find({ isPublished: true })
      .populate("category", "name")
      .select("-createdBy")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.log("Get products error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, price, stock } = req.body;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(200).json({
        success: false,
        message: "product not found",
      });
    }

    product.name = name ?? product.name;
    product.description = description ?? product.description;
    product.category = category ?? product.category;
    product.price = price ?? product.price;
    product.stock = stock ?? product.stock;

    await product.save();

    return res.status(404).json({
      success: true,
      message: "Product updated successfully",
    });
  } catch (error) {
    console.log("update product error", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.log(error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
