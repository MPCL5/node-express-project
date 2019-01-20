console.log('App is running...');

const express = require('express');
const bodyParser = require('body-parser');
const hbs = require('hbs');  // idk why I use this :|
const mysql = require('mysql');  // my project use mysql database :).
const crypto = require('crypto'); // I called this package for hashing. based on: https://stackoverflow.com/a/11869589/10742959
const fs = require('fs');
const reportFile = "Report.txt";

function GetHash(text)
{
    return crypto.createHash('md5').update(text).digest('hex');
}

function GetSecret(ip,clientInformation)
{
    return GetHash(ip.substring(1,4) + clientInformation.substring(0,32));
}

var app = express()
var mysqlConnection = mysql.createConnection({
    host: "localhost",
    user: "Admin",
    password: "UP7uiAK0VafJeKX9",
    database: "data"
});

// A function that avoids fake requests.
// based on: https://javascript.info/async-await
async function VerifyClient(ip,clientInformation,secret)
{
    try
    {
        var final = false;
        let query = "SELECT * FROM secrets WHERE IPAddress = '"+ ip +"' AND Agent = '" + GetHash(clientInformation) + "' AND secret = '" + secret + "'";

        if(secret == GetSecret(ip,clientInformation) || ip != '' || clientInformation != '')
            {
                let qry = mysqlConnection.query(query,(er,result) => {
                    if (er) throw er;
                    
                    if(!result[0])
                        final = false;  // access the final var outside of this function
                    else        
                        final=true;                                      
                });
                await qry
            }
        else
            final = false;

        return final;
    }
    catch 
    {
        console.log("An error occured during verifing client");
        return false;
    } 
}

hbs.localsAsTemplateData(app);
app.use(bodyParser.json()); // support json encoded bodies
app.use(express.static('public')); // all have access
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.set('view engine','hbs');

mysqlConnection.connect((err) => {
    console.log("Connecting to MySQL...");
    if (err) throw err;
    console.log("Connected!");
});

function sendNotFound(res)
{
    res.sendStatus(404);
}

function sendMessage(res,title,msg)
{
    app.locals.title = title;
    app.locals.message = msg;
    res.render('message.hbs');
}

app.get('/',(req,res)=>{
    res.render('main.hbs');
})

app.post('/check', (req, res) => {
    let ip = req.connection.remoteAddress; // get client ip address.
    let clientInformation = req.headers['user-agent']; // get client information.
    let firstName = req.body.firstName;
    let lastName = req.body.lastName;
    let id = req.body.id;
    
    mysqlConnection.query("SELECT * FROM rawdata WHERE firstName = '"+ firstName +"' AND lastName = '" + lastName + "' AND id = '" + id + "'",(er,result) => {
      
        if(!result[0] || firstName == '' || lastName == '' || id == '')
        {
            console.log("check: not found sent");
            console.log("SELECT * FROM rawdata WHERE firstName = '"+ firstName +"' AND lastName = '" + lastName + "' AND id = '" + id + "'")
            console.log(result)
            sendMessage(res,'Error',"Can't find your informations in our database.")
        }
        else if(result[0]['complete'] == "" || result[0]['complete'] == "No")
        {   
            //console.log("check: Accepted, client information is: " + clientInformation);

            let secret =  GetSecret(ip,clientInformation);// a security option that avoid fake requests
            let queryOrder = "INSERT INTO secrets (IPAddress, Agent, secret) VALUES ('"+ ip +"', '"+ GetHash(clientInformation) +"', '"+ secret +"')";
            
            mysqlConnection.query(queryOrder,(er,result) => {
                if (er) throw er;
                console.log("one client accessed.");
                res.redirect("/complete?secret=" + secret + "&id=" + id);
            });
        }
        else
        {
            // TODO: Desigen a good html to send.
            res.send("ettelaat shoma gablan sabt shode ast");
        }

    });
});

app.get('/complete',(req,res) => {
    let secret = req.query.secret;
    let ip = req.connection.remoteAddress; // get client ip address.
    let id = req.query.id;
    let clientInformation = req.headers['user-agent']; // get client information.

    app.locals.id = id;
    if(VerifyClient(ip,clientInformation,secret))
        res.render("secoundForm.hbs")
    else
        sendMessage(res,'Error',"I think it's a fake request.")
});

app.post('/Final',(req,res) =>{
    let request = req.body;
    let secret = request.secret;
    let id = request.id;
    let ip = req.connection.remoteAddress;
    let clientInformation = req.headers['user-agent'];

    if(VerifyClient(ip,clientInformation,secret))
    {
        let firstName = request.firstName;
        let lastName  = request.lastName;
        let sex = request.gender;
        let age = request.age;
        let email = request.email;
        let phone = request.phone;
        let state = request.State;
        let address = request.address;

        mysqlConnection.query("INSERT INTO final (id, firstName, lastName, sex, age, email, phone, state, address) VALUES ('"+ id +"','"+ firstName +"', '"+ lastName +"', '"+ sex +"', '"+ age +"', '"+ email +"','"+ phone +"','"+ state +"','"+ address +"' )",(er,result) => {
            if (er) throw er;
            console.log("one record inserted");

            mysqlConnection.query("DELETE FROM `secrets` WHERE Agent = '"+ GetHash(clientInformation) +"'",(err,result) => {
                if (err) throw err;
                console.log("security key hase been removed");

                mysqlConnection.query("UPDATE `rawdata` SET complete='Yes' WHERE id = '"+ id +"'", (error,result) => {
                    if (error) throw error;
                    console.log("set to complete");
                    // res.send("Save successfull")
                    sendMessage(res,"Success","Your data saved successfully.")
                });
            });
        });
    }
    else
    {
        sendMessage(res,'Error',"Can't save your informations in database.")
    }
});

app.get('/search', (req,res) => {
    mysqlConnection.query("SELECT COUNT(*) FROM final", (er,result) => {
        if (er) throw er;
        app.locals.registered = result[0]['COUNT(*)'];
        res.render('search.hbs');
    });
});

app.post('/search', (req,res) =>{
    let sort = req.body.sort;
    let search = req.body.search;

    mysqlConnection.query("SELECT * FROM `final` WHERE "+ sort +" ='"+ search +"' ",(er,result) =>{
        if (er) throw er;
        //console.log(result.length);
        if(result.length != 0)
        {
            fs.writeFileSync(reportFile ,"University of Tabriz | Registred members"); // prepare text file to send.
            for(let i=0;i<result.length;i++)
            {
                let item = result[i];
                fs.appendFileSync(reportFile,'\n=============================================');
                fs.appendFileSync(reportFile,"\nFirst Name: " + item.firstName + "\nLast Name: " + item.lastName + "\nGender: " + item.sex + "\nAge: " + item.age + "\nPhone: " + item.phone + "\nEmail: " + item.email + "\nState: " + item.state + "\nAddress: " + item.address)
            }

            res.sendFile( __dirname + "/" + reportFile);
        }
    });
});

// custom 404 page. from: https://stackoverflow.com/a/40204504/10742959
app.use((req, res) =>{
    res.status(404);
    app.locals.title = "404 - not found";
    app.locals.message = "The page you’re looking for does not exist."
    res.render('message.hbs');
});

app.listen(8080);