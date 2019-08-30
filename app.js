const express = require('express');

const bodyParser = require('body-parser');
const mongoose = require('mongoose');   
const path = require('path');
const multer = require('multer');
const app = express();
const fileStorage = multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,'images');
    },
    filename:(req,file,cb)=>{
        cb(null, new Date().getTime() +'-'+file.originalname);
    }
});
const fileFilter = (req,file,cb)=>{
    if(file.mimetype=='image/png' || file.mimetype=='image/jpg' || file.mimetype=='image/jpeg'){
        cb(null,true);
    }else{
        cb(null,false);
    }
};
const MONGOURI ='mongodb://127.0.0.1:27017/blogNodeAPI';
const port = process.env.PORT || 8080;
//app.use(bodyParser.urlencoded())// x-www-form-url
app.use(bodyParser.json()); // application/json
app.use(multer({storage:fileStorage,fileFilter:fileFilter}).single('image'));
app.use('/images',express.static(path.join(__dirname,'images')));
app.use((req,res,next)=>{
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

app.use((error,req,res,next)=>{
    const status = error.statusCode || 500;
    const message = error.message;
    const data = error.data;
    res.status(status).json({message:message, data:data});
});
mongoose.connect(MONGOURI, { useNewUrlParser: true })
    .then((result) => {
        app.listen(port, () => {
            console.log('Server is running on mongoose ', port);
        });
       
    })
    .catch(error => {
        console.log('connection error is: ', error);
    });
