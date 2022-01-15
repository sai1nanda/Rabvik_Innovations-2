require('dotenv').config({path:__dirname+'/.env'})
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const passport = require("passport");
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
require('./config/passportConfig');

const app = express();

app.set('view engine', 'ejs');
app.set('x-powered-by', false);

mongoose.connect(process.env.MONGO_URI_LOCAL,{
  useNewUrlParser: true, 
  useUnifiedTopology: true,
  useCreateIndex:true
}).then(()=>console.log('MongoDB is connected !'))
.catch(err=>console.log(err))

const sessionStore = new MongoStore({
  mongooseConnection:mongoose.connection,
  collection:'sessions'
});

app.use(express.static("public"));
app.use('/uploads', express.static('uploads'));
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));

app.use(session({
  name:'sid',
  secret:process.env.SESSION_SECRET,
  resave:false,
  saveUninitialized:false,
  store:sessionStore,
  cookie:{
    httpOnly:true,
    maxAge:1000 * 60 * 60 * 24
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.get("/", function(req, res){
    res.render("landing");
  });

app.get('/auth/google',
  passport.authenticate('google',{ scope:
      [ 'email', 'profile' ] }
));

app.get('/google/callback',
  passport.authenticate('google',{
      successRedirect:'/dashboard',
      failureRedirect:'/'
  })
);

app.get('/auth/outlook',
  passport.authenticate('windowslive', {
    scope: [
      'openid',
      'profile',
      'offline_access',
      'https://outlook.office.com/Mail.Read'
    ]
  })
);

app.get('/auth/outlook/dashboard', 
  passport.authenticate('windowslive', { failureRedirect: '/' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/dashboard');
  });

const {isAuthenticated} = require('./config/ensureAuth');

const User = require('./models/User');

app.get("/dashboard",isAuthenticated,async function(req, res){
  const profileDetail = await User.findOne({_id:req.user ? req.user._id : req.session.user._id});
  console.log(req.user);
    res.render("dashboard",{user:req.user,profileDetail});
});

app.use('/',require('./routes/question-route'));
app.use('/funds',isAuthenticated ,require('./routes/funds-route')) ;
app.use('/financial',isAuthenticated,require('./routes/financials-route')) ;
app.use('/user',isAuthenticated,require('./routes/profile-route')) ;

app.post("/register",require('./routes/auth-route').registerController);

app.post("/login",require('./routes/auth-route').loginController);

app.get("/logout", require('./routes/auth-route').logoutController);



app.listen(process.env.PORT || 3000, function(){
  console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});
