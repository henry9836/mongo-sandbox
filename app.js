//GLOBALS
console.log("[+] Server is starting...")
var mongoose = require("mongoose");
var express = require("express");
var parser = require("body-parser");
var session = require("express-session");
var passport = require("passport");
var passportLocal = require("passport-local");
var passportLocalMongoose = require("passport-local-mongoose");
var methodOverride = require("method-override");
var app = express();

var userSchema = new mongoose.Schema({
	username: String,
	password: String
});
//Add more stuff to userSchema
userSchema.plugin(passportLocalMongoose);
var User = mongoose.model("User", userSchema);

console.log("[+] Setting up params...")
//Set static so we don't have to type /public all the time
app.use(express.static("public"));
app.use(parser.urlencoded({extended: true}));
app.use(require("express-session")({secret: 'Ygt2a2YLYSK7PCjg', resave: false, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));

mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);

passport.use(new passportLocal(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

console.log("[+] Connecting To Database...")
mongoose.connect("mongodb://localhost/users");

app.listen(process.env.PORT || "3000", process.env.IP, function(){
	console.log("[+] PORT BOUND");	
});

function debugDB(err, done){
	if (err){
		console.log("Failed to create entry in DB");
	}
	else{
		console.log("Entry succesfully added to DB");
	}
}

function createUser(_username, _password, res){
	//Construct User
	var tmpUser = new User({
		username: _username,
		password: _password
	})
	
	User.register(new User({username: tmpUser.username}), tmpUser.password, function(err, user){
		if (err){
			//Failed
			console.log(err);
			return res.render("register", {errorText: err});
		}
		else{
			passport.authenticate("local")(req, res, function(){
				//Redirect user
				res.redirect("home")
			})
		}
	})
	
	//Save onto db
	//user.save(debugDB);
	
	//return user;
}

app.get("/", function(req, res){
	//Check passport
	var authed = req.isAuthenticated();
	
	res.render("home.ejs", {authed: authed});
});

app.get("/logout", function(req,res){
	req.logout();
	//Check passport
	var authed = req.isAuthenticated();
	res.render("home.ejs", {authed: authed});
});

app.get("/login", function(req,res){
	res.render("login.ejs", {errorText: ""});
});

app.get("/register", function(req,res){
	res.render("register.ejs", {errorText: ""});
});

app.post("/register", function(req,res){
	console.log(req.body);
	var _username = req.body.username;
	var _password = req.body.password;
	
	User.register(new User({username: _username}), _password, function(err, user){
		if (err){
			//Failed
			console.log("Error: " + err);
			return res.render("register.ejs", {errorText: err});
		}
		else{
			passport.authenticate("local")(req, res, function(){
				//Redirect user
				res.redirect("/")
			})
		}
	})
});

app.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) { 
		console.log("ERROR: " + err);
		return res.render('login.ejs', {errorText: "Interal Server Error"}); 
	}
    if (!user) { 
		console.log("ERROR: user is null");
		return res.render('login.ejs', {errorText: "Username/Password doesn't exist"}); 
	}
    req.logIn(user, function(err) {
      if (err) { 
		  console.log("ERROR2: " + err);
		  return res.render('login.ejs', {errorText: "Interal Server Error"}); 
	  }
	console.log('Loggedin');
    return res.redirect('/');
    });
  })(req, res, next);
});

function main(){
	console.log("[+] Ready.");
}

main();