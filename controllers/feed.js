const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');
const io = require('../socket');
const Post = require('../models/post');
const User = require('../models/user');
exports.getPosts = (req, res, next) => {
    const currentPage = req.query.page || 1;
    const perPage = 2;
    let totalItems;
    Post.find().countDocuments()
        .then(count => {
            totalItems = count;
            return Post.find().populate('creator').sort({createdAt:-1}).skip((currentPage - 1) * perPage).limit(perPage);
        })
        .then(posts => {
            if (!posts) {
                const error = new Error('Could not found posts');
                error.statusCode = 404;
                throw error;
            }
            res.status(200).json({
                message: 'Posts are found!',
                posts: posts,
                totalItems: totalItems
            });
        })
        .catch(error => {
            if (!error.statusCode) {
                error.statusCode = 500;
            }
            next(error);
        });

};
exports.createPost = (req, res, next) => {
    const error = validationResult(req);
    if (!error.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect');
        error.statusCode = 422;
        throw error;
    }
    if (!req.file) {
        const error = new Error('image file is not provided');
        error.statusCode = 422;
        throw error;
    }
    const title = req.body.title;
    const content = req.body.content;
    const imageUrl = req.file.path.replace("\\", "/");
    let creator;
    /****Create db connection****/
    const post = new Post({
        title: title,
        content: content,
        imageUrl: imageUrl,
        creator: req.userId
    });
    post.save()
        .then(result => {
            io.getIO().emit('posts',
                {
                    action: 'create',
                    post: {
                        ...post._doc,
                        creator: {
                            _id: req.userId,
                            name: user.name
                        }
                    }
                });
            return User.findById(req.userId);
        })
        .then(user => {
            creator = user;
            user.posts.push(post);
            return user.save();

        }).then(result => {
            res.status(201).json({
                message: "Post is created successfully.",
                post: post,
                creator: { _id: creator._id, name: creator.name }
            })
        })
        .catch(error => {
            if (!error.statusCode) {
                error.statusCode = 500;
            }
            next(error);
            console.log(error);
        });

};
exports.getPost = (req, res, next) => {
    const postId = req.params.postId;
    Post.findById(postId)
        .then(post => {
            if (!post) {
                const error = new Error('Could not found post');
                error.statusCode = 404;
                throw error;
            }
            res.status(200).json({ message: 'Post found', post: post });
        })
        .catch(error => {
            if (!error.statusCode) {
                error.statusCode = 500;
            }
            next(error);
        });
};
exports.updatePost = (req, res, next) => {
    const error = validationResult(req);
    if (!error.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect');
        error.statusCode = 422;
        throw error;
    }
    const postId = req.params.postId;
    const title = req.body.title;
    const content = req.body.content;
    let imageUrl = req.body.image;

    if (req.file) {
        imageUrl = req.file.path.replace("\\", "/");
    }
    if (!imageUrl) {
        const error = new Error('No file picked');
        error.statusCode = 422;
        throw error;
    }
    Post.findById(postId).populate('creator')
        .then(post => {
            if (!post) {
                const error = new Error('Could not found post');
                error.statusCode = 404;
                throw error;
            }
            if (post.creator._id.toString() !== req.userId) {
                const error = new Error('Not authorized');
                error.statusCode = 403;
                throw error;
            }
            if (imageUrl !== post.imageUrl) {
                clearImage(post.imageUrl);
            }
            post.title = title;
            post.content = content;
            post.imageUrl = imageUrl;
            return post.save();

        }).then(post => {
            io.getIO().emit('posts',
            {
                action: 'update',
                post: post
            });
            res.status(200).json({ message: 'Post has been updated', post: post });
        })
        .catch(error => {

            if (!error.statusCode) {
                error.statusCode = 500;
            }
            next(error);
        });
};

const clearImage = filepath => {
    filepath = path.join(__dirname, '..', filepath);
    fs.unlink(filepath, error => {
        console.log(error);
    });
};

exports.deletePost = (req, res, next) => {
    const postId = req.params.postId;
    Post.findById(postId)
        .then(post => {
            //check logged in user
            if (!post) {
                const error = new Error('Could not found post');
                error.statusCode = 404;
                throw error;
            }
            if (post.creator.toString() !== req.userId) {
                const error = new Error('Not authorized');
                error.statusCode = 403;
                throw error;
            }
            clearImage(post.imageUrl);
            return Post.findOneAndRemove(postId);
        }).then(result => {
            return User.findById(req.userId);
        })
        .then(user => {
            user.posts.pull(postId);
            return user.save();
        }).then(result => {
            console.log(result);
            io.getIO().emit('posts',
            {
                action: 'delete',
                post: postId
            });
            res.status(200).json({ message: 'post has been deleted' })
        })
        .catch(error => {
            if (!error.statusCode) {
                error.statusCode = 500;
            }
            next(error);
        });
};