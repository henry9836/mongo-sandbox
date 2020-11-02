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

console.log("[+] Building Schemes...")
var listingScheme = new mongoose.Schema({
	title: String,
	desc: String,
	fullDesc: String,
	img: String,
	price: Number,
	lister: String,
	user_id: String
});

var userSchema = new mongoose.Schema({
	username: String,
	password: String
});
//Add more stuff to userSchema
userSchema.plugin(passportLocalMongoose);
var User = mongoose.model("User", userSchema);
var Listing = mongoose.model("Listing", listingScheme);

console.log("[+] Setting up Params...")
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
		console.log(err);
	}
	else{
		console.log("Entry succesfully added to DB");
	}
}

app.get("/", function(req, res){
	//Check passport
	var authed = req.isAuthenticated();
	var errText = "";
	//Get listings
	Listing.find({}, function(err, data){
		if (err){
			errText = "Could not load listings";
			console.log(err);
			res.render("home.ejs", {authed: authed, errorText: errText, listings: data});
		}
		else{
			res.render("home.ejs", {authed: authed, errorText: errText, listings: data});
		}
	})
});

app.get("/profile", function(req, res){
	//Check passport
	if (req.isAuthenticated() === false){
		return res.redirect("/login");
	}
	
	console.log(req.user);
	
	res.render("profile.ejs", {username: req.user.username});
});

app.get("/logout", function(req,res){
	var errText = "";
	req.logout();
	//Check passport
	var authed = req.isAuthenticated();
	Listing.find({}, function(err, data){
		if (err){
			errText = "Could not load listings";
			console.log(err);
			res.render("home.ejs", {authed: authed, errorText: errText, listings: data});
		}
		else{
			res.render("home.ejs", {authed: authed, errorText: errText, listings: data});
		}
	})
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

app.get("/newListing", function(req,res){
	//Check passport
	if (req.isAuthenticated() === false){
		return res.redirect("/login");
	}
	
	res.render("newListing.ejs", {username: req.user.username});
});

app.post("/newListing", function(req,res){
	//Check passport
	if (req.isAuthenticated() === false){
		return res.redirect("/login");
	}
	
	//Construct Lisiting
	var tmpListing = new Listing({
		title: req.body.title,
		desc: req.body.desc,
		fullDesc: req.body.fullDesc,
		img: req.body.img,
		price: req.body.price,
		lister: req.user.username,
		user_id: req.user._id
	})
	
	//Save onto db
	tmpListing.save(debugDB);
	
	res.redirect("/");
});

function main(){
	console.log("[+] Ready.");
}

main();