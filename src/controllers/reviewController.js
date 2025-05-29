import Review from '../models/reviewModel.js';
import mongoose from 'mongoose';

// Create a new review
export const createReview = async (req, res) => {
    try {
        const { restaurant, order, rating, comment } = req.body;
        const review = new Review({
            user: req.user._id,
            restaurant,
            order,
            rating,
            comment,
        });
        await review.save();
        res.status(201).json({ message: 'Review created successfully', review });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const getReviews = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            restaurant,
            user,
            rating,
            sort = '-createdAt',
        } = req.query;

        const filter = {};
        if (restaurant) filter.restaurant = restaurant;
        if (user) filter.user = user;
        if (rating) filter.rating = Number(rating);

        const pageNumber = parseInt(page, 10);
        const pageSize = parseInt(limit, 10);
        const skip = (pageNumber - 1) * pageSize;

        const [reviews, total] = await Promise.all([
            Review.find(filter)
                .populate('user', 'name')
                .populate('restaurant', 'name')
                .populate('order', 'orderNumber')
                .sort(sort)
                .skip(skip)
                .limit(pageSize),
            Review.countDocuments(filter),
        ]);

        // Respond with paginated data
        res.status(200).json({
            total,
            page: pageNumber,
            pages: Math.ceil(total / pageSize),
            reviews,
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};


// Update a review
export const updateReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;

        const review = await Review.findById(id);
        if (!review) return res.status(404).json({ error: 'Review not found' });

        if (!review.user.equals(req.user._id)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (rating !== undefined) review.rating = rating;
        if (comment !== undefined) review.comment = comment;

        await review.save();
        res.status(200).json({ message: 'Review updated successfully', review });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Delete a review
export const deleteReview = async (req, res) => {
    try {
        const { id } = req.params;

        const review = await Review.findById(id);
        if (!review) return res.status(404).json({ error: 'Review not found' });

        if (!review.user.equals(req.user._id)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await review.remove();
        res.status(200).json({ message: 'Review deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
