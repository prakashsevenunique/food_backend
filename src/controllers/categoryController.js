import Category from '../models/categoryModel.js';
import upload from '../config/multer.js';

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const createCategoryTextOnly = async (req, res) => {
  try {
    const { name, description, type, isActive } = req.body;

    const existing = await Category.findOne({ name });
    if (existing) return res.status(400).json({ message: "Category already exists" });

    const category = new Category({
      name,
      description,
      type,
      isActive,
      image: "", 
    });

    const saved = await category.save();
    res.status(201).json({ message: "Category created", data: saved });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const uploadCategoryImage = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'categories',
    });

    fs.unlinkSync(req.file.path);

    category.image = result.secure_url;
    await category.save();

    res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      imageUrl: result.secure_url,
    });
  } catch (error) {
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateCategoryTextOnly = async (req, res) => {
  try {
    const { name, description, type, isActive } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category) return res.status(404).json({ message: "Category not found" });

    if (name) category.name = name;
    if (description) category.description = description;
    if (type) category.type = type;
    if (isActive !== undefined) category.isActive = isActive;

    const updated = await category.save();
    res.status(200).json({ message: "Category updated", data: updated });
  } catch (error) {
    res.status(500).json({ message: "Update failed", error: error.message });
  }
};

export const updateCategoryImageOnly = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    if (!req.file) return res.status(400).json({ message: "No image file uploaded" });

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'categories',
    });

    fs.unlinkSync(req.file.path);

    category.image = result.secure_url;
    await category.save();

    res.status(200).json({
      success: true,
      message: "Image updated successfully",
      imageUrl: result.secure_url,
    });
  } catch (error) {
    res.status(500).json({ message: "Image update failed", error: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const deletedCategory = await Category.findByIdAndDelete(req.params.id);

    if (!deletedCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
