/************************************************************
                requiring the dependencies
****************************************************************/

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const alert = require('alert'); 


const app = express();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));

app.use(session({
    secret: "This a secret - encryption.",
    resave:false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

/************************************************************
                connecting mongoDB 
****************************************************************/

mongoose.connect("mongodb+srv://appDB:jo%40123@cluster0.phbb5.mongodb.net/userDB", {useNewUrlParser: true});

//user schema

const userSChema = new mongoose.Schema ({
    email: String,
    username: String,
    password: String
});

//forum schema

const forumSChema = new mongoose.Schema ({
    field: String,
    questions:  { 
        username: String, 
        question: String, 
        time: { type: Date, default: Date.now }
        
    },
    answers: [{ 
        username: String, 
        answer: String, 
        time: { type: Date, default: Date.now } 
    }]
});

//channel schema

const channelSChema = new mongoose.Schema ({
    creator: String,
    channel: String,
    description: String,
    messages: [{ 
        username: String, 
        message: String, 
        time: { type: Date, default: Date.now } 
    }]
    
});

userSChema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSChema);

const Doubt = new mongoose.model("Doubt", forumSChema);

const Channel = new mongoose.model("Channel", channelSChema);

/************************************************************
                configuring passportJS
****************************************************************/

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


/************************************************************
                Routing -index page
****************************************************************/

app.get("/",function(req,res){
    res.render("index");
});

/************************************************************
                Routing -signin , signup page
****************************************************************/

app.get("/signup",function(req,res){
    res.render("signup");
});

app.get("/signin",function(req,res){
    res.render("signin");
});

/************************************************************
                Routing -home page
****************************************************************/

app.get("/home",function(req,res){

    if (req.isAuthenticated()){
        res.render("home");
    }else {
        res.redirect("/signin");
    }
});

/************************************************************
                Routing -forum page
****************************************************************/

//search page

app.get("/forum",function(req,res){

    if (req.isAuthenticated()){
        res.render("forumSearch");
    }else {
        res.redirect("/signin");
    }
});

app.post("/forumsearch",function(req,res){

    const searchKey = req.body.question;

    Doubt.find(function(err,doubts){
        if(err){
            console.log(err);
        } else{
            let matched = [];
            doubts.forEach(function(doubtt){
                if(doubtt.answers.length > 0){
                    if((doubtt.questions.question).includes(searchKey)){
                        matched.push(doubtt)
                    }      
                                 
                }  
            });
            res.render("forumAns",{data:matched});  
        }
    });

});

//forum answers page

app.get("/forum/answers",function(req,res){

    if (req.isAuthenticated()){
        Doubt.find(function(err,doubts){
            if(err){
                console.log(err);
            } else{
                let answered = [];
                doubts.forEach(function(doubtt){
                    if(doubtt.answers.length > 0){
                        answered.push(doubtt);                    
                    }  
                });
                res.render("forumAns",{data:answered});  
            }
        });
    }else {
        res.redirect("/signin");
    }
});

//forum questions page

app.get("/forum/questions",function(req,res){

    if (req.isAuthenticated()){
        Doubt.find(function(err,doubts){
            if(err){
                console.log(err);
            } else{
                let unanswered = [];
                doubts.forEach(function(doubtt){
                    if(doubtt.answers.length === 0){
                        
                        unanswered.push(doubtt)
                        
                    }  
                });
                res.render("forumQues",{data:unanswered});  
            }
        });
    }else {
        res.redirect("/signin");
    }
});

//forum post new doubts

app.get("/forum/post-new-doubt",function(req,res){

    if (req.isAuthenticated()){
        res.render("forumpost");
    }else {
        res.redirect("/signin");
    }
});

app.post("/post-new-doubt",function(req,res){

    const fieldInput = req.body.field;
    const usernameInput = req.session.passport.user;
    const questionInput = req.body.question;

    const doubt = new Doubt ({
        field: fieldInput,
        questions:{
            username: usernameInput,
            question : questionInput
        }
    });
    doubt.save();
    
    res.redirect("/forum/questions");
});

//forum - posting answers for the qestions

app.get("/forum/post-new-answer",function(req,res){

    if (req.isAuthenticated()){
        res.render("forumanswer");
    }else {
        res.redirect("/signin");
    }
});

app.post("/post-new-answer-page",function(req,res){

    const question = req.body.question;

    res.render("forumanswer",{data:question});

    
});

app.post("/post-new-answer",function(req,res){

    const questionInput = req.body.question;
    const answerInput = req.body.answer;
    const usernameInput = req.session.passport.user;
    
    const answer = { 
        answers: { 
            username: usernameInput, 
            answer: answerInput,
        } 
    }

    Doubt.find(function(err,doubts){
        if(err){
            console.log(err);
        } else{
            doubts.forEach(function(doubtt){
                if(doubtt.questions.question === questionInput){
                    Doubt.findOneAndUpdate({ _id : doubtt._id}, { $push: answer}, function (err){
                        if(err){
                            console.log(err);
                        }
                    })
                }  
            });
            
        }
    });

    res.redirect("/forum/answers");
});

/************************************************************
                Routing -community page
****************************************************************/

//community

app.get("/community",function(req,res){
    if (req.isAuthenticated()){
        Channel.find(function(err,channels){
            if(err){
                console.log(err);
            } else{
                res.render("community",{data:channels});  
            }
        });
    }else {
        res.redirect("/signin");
    }
    
});

app.get("/community/:name",function(req,res){
    if (req.isAuthenticated()){
        const user = req.session.passport.user;
        Channel.find(function(err,channels){
            if(err){
                console.log(err);
            } else{
                channels.forEach(function(data){
                    if(req.params.name === data.channel){
                        res.render("comchannel",{data:data,user:user});  
                    }
                })
            }
        });
    }else {
        res.redirect("/signin");
    }
    
});

app.post("/community/send-msg",function(req,res){
    const channelName = req.body.channelName;
    const msg = req.body.msg;
    const usernameInput = req.session.passport.user;

    const message = {
        messages: { 
            username: usernameInput, 
            message: msg
        }
    }

    Channel.find(function(err,channels){
        if(err){
            console.log(err);
        } else{
            Channel.findOneAndUpdate({ channel : channelName}, { $push: message}, function (err){
                if(err){
                    console.log(err);
                }
            })  
            
            
        }
    });
    
    res.redirect("/community/"+channelName); 

});

//community create

app.get("/create-community",function(req,res){
    if (req.isAuthenticated()){
        res.render("comcreate");
     }else {
         res.redirect("/signin");
     }
    
});

app.post("/create-community",function(req,res){

    const channelName = req.body.channelName;
    const usernameInput = req.session.passport.user;
    const description = req.body.description;

    
    const channel = new Channel ({
        creator: usernameInput,
        channel: channelName,
        description:description,
                
    });
    channel.save();
    
    res.redirect("/community");
});



/************************************************************
                Routing - Profile page
****************************************************************/

app.get("/profile",function(req,res){
    if (req.isAuthenticated()){
        User.findOne({username : req.session.passport.user},function(err,user){
     
            res.render("profile",{username:user.username,email:user.email});
        })
    }else {
        res.redirect("/signin");
    }

    
});



/************************************************************
                Routing - contact page
****************************************************************/

app.get("/contact",function(req,res){

    if (req.isAuthenticated()){
        res.render("contact");
    }else {
        res.redirect("/signin");
    }
});

/************************************************************
                Authentication
****************************************************************/

//registration

app.post("/signup",function(req,res){

    User.find({username : req.body.username},function(err,users){
        if(err){
            console.log(err);
        } else if(users.length != 0){
            alert("Usernme already aailable! please enter different name to register!");
            res.redirect("/signup");

        }else if(users.length === 0){
            User.register({email:req.body.email,username:req.body.username},req.body.password, function(err, user){
                if(err){
                    console.log(err);
                    res.redirect("/register");
                }else{
                    passport.authenticate("local")(req, res, function(){
                        res.redirect("/home");
                    });
                }
            })  
        }
    });

    
});

//login

app.post("/signin",function(req,res){

    const user = new User({
        username : req.body.username,
        password : req.body.password
    });

    req.login(user, function(err){
        if (err){
            console.log(err);
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/home");
            });
        }
    });
    
});

/************************************************************
                Routing - signout
****************************************************************/

app.get("/signout",function(req, res, next){
    req.logout();
    res.redirect("/");
})

/************************************************************
                port configuration
****************************************************************/

app.listen(process.env.PORT || 3000, function(){
});