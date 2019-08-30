const User = require('../models/user');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
exports.singup = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect');
        error.statusCode = 422;
        error.data = errors.array();
        throw error;
    }
    const email = req.body.email;
    const password = req.body.password;
    const name = req.body.name;
    bcrypt.hash(password, 12)
        .then(hashedPassword => {
            const user = new User({
                email: email,
                password: hashedPassword,
                name: name
            });
            return user.save();
        })
        .then(result => {
            res.status(201).json({ message: ' User has been created', userId: result._id });
        })
        .catch(error => {
            if (!error.statusCode) {
                error.statusCode = 500;
            }
            next(error);
            console.log(error);
        });
};
exports.login = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    let loadeduser;
    User.findOne({ email: email })
        .then(user=>{
            if(!user){
                const error = new Error('A user with this email could not found');
                error.statusCode = 401;
                throw error;
            }
            loadeduser = user;
            return bcrypt.compare(password,user.password);
        })
        .then(isEqual=>{
            if(!isEqual){
                const error = new Error('invalid password');
                error.statusCode = 401;
                throw error;
            }
            const token = jwt.sign({
                    email: loadeduser.email,
                    userId: loadeduser._id.toString()
                },'topscecretofthenodejsapi',{ expiresIn:'1h'}
                );
                res.status(200).json({token:token, userId: loadeduser._id.toString()});
        })
        .catch(error => {
            if (!error.statusCode) {
                error.statusCode = 500;
            }
            next(error);
            console.log(error);
        });
};